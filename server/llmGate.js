/**
 * llmGate.js —— LLM 上游调用闸门
 * ---------------------------------------------------
 * 多数供应商对组织级并发有硬限制（常见为 1）。超限即 HTTP 429：
 *   "request reached max organization concurrency: 1, please try again after 1 seconds"
 *
 * 本模块提供：
 *   1. 串行闸门：同一时刻只放行 N 路上游请求（默认 1），其余排队；
 *   2. 中断：客户端断开 / 超时 / 主动 abort 时立刻取消上游 fetch，释放槽位；
 *   3. 429 退避重试：尊重 Retry-After 或错误文案中的 after N seconds。
 */

export function createAbortError(message = 'LLM 调用已中断') {
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

export function isAbortError(err) {
  return err?.name === 'AbortError' || err?.code === 'ABORT_ERR'
}

export function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(createAbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** 解析 429 的建议等待时间（毫秒） */
export function parseRetryAfterMs(response, bodyText = '', attempt = 0) {
  const header = response?.headers?.get?.('retry-after')
  if (header) {
    const sec = Number(header)
    if (Number.isFinite(sec) && sec >= 0) return Math.min(sec * 1000, 60_000)
    const date = Date.parse(header)
    if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 1000), 60_000)
  }
  const m = String(bodyText).match(/after\s+(\d+)\s+seconds?/i)
  if (m) return Math.min(Number(m[1]) * 1000, 60_000)
  const backoff = Math.min(1000 * 2 ** attempt, 16_000)
  return backoff + Math.floor(Math.random() * 250)
}

export function isRateLimited(status, bodyText = '') {
  if (status === 429) return true
  return /max organization concurrency|rate.?limit|too many requests|TPM|RPM/i.test(
    String(bodyText)
  )
}

/**
 * 有限并发闸门。等待中的任务若被 abort，会从队列移除且不占用槽位。
 * @param {number} [concurrency=1]
 */
export function createSerialGate(concurrency = 1) {
  const limit = Math.max(1, Number(concurrency) || 1)
  let active = 0
  const waiters = []

  function acquire(signal) {
    if (signal?.aborted) return Promise.reject(createAbortError())
    if (active < limit) {
      active++
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const waiter = {
        grant() {
          active++
          resolve()
        },
        reject
      }
      const onAbort = () => {
        const i = waiters.indexOf(waiter)
        if (i >= 0) waiters.splice(i, 1)
        reject(createAbortError())
      }
      if (signal) {
        if (signal.aborted) {
          reject(createAbortError())
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
        waiter.cleanup = () => signal.removeEventListener('abort', onAbort)
      }
      waiters.push(waiter)
    })
  }

  function release() {
    active = Math.max(0, active - 1)
    const next = waiters.shift()
    if (!next) return
    next.cleanup?.()
    next.grant()
  }

  async function run(task, { signal } = {}) {
    await acquire(signal)
    try {
      if (signal?.aborted) throw createAbortError()
      return await task()
    } finally {
      release()
    }
  }

  return { run }
}

/**
 * 单次调用的中断控制器：超时 + 客户端断开都会 abort，立刻释放上游并发槽。
 */
export function createCallController(req, res, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) controller.abort('timeout')
  }, timeoutMs)

  const onGone = () => {
    if (!res.writableEnded && !controller.signal.aborted) controller.abort('client')
  }
  res.on('close', onGone)

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      res.off('close', onGone)
    }
  }
}

export function abortReason(signal) {
  if (!signal?.aborted) return null
  return signal.reason === 'timeout' || signal.reason === 'client' ? signal.reason : 'abort'
}

/**
 * 带 429 重试的上游 fetch。整段调用（含重试等待）共享同一个 AbortSignal。
 * @returns {Promise<{response: Response} | {errorStatus:number, errorText:string}>}
 */
export async function fetchLlmUpstream({ url, headers, body, signal, maxRetries = 5 }) {
  let lastStatus = 0
  let lastText = ''

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw createAbortError()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal
      })

      if (response.ok) return { response }

      const errorText = await response.text().catch(() => '')
      lastStatus = response.status
      lastText = errorText

      if (isRateLimited(response.status, errorText) && attempt < maxRetries) {
        await sleep(parseRetryAfterMs(response, errorText, attempt), signal)
        continue
      }

      return { errorStatus: response.status, errorText }
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) throw createAbortError()
      throw err
    }
  }

  return { errorStatus: lastStatus || 429, errorText: lastText }
}
