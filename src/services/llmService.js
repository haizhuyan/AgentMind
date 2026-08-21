import axios from 'axios'
import { API_BASE } from '../config.js'
import { isDemoMode } from './demoMode.js'
import { demoLLM, demoLLMStream, DEMO_MODELS } from './demoData.js'

/**
 * llmService.js —— 大模型调用（后端代理）
 * ---------------------------------------------------
 * LLM 密钥已迁移到后端（server/index.js），前端不再持有密钥。
 * 所有智能体通过 /api/llm 由后端转发到大模型接口。
 *
 * 中断与限流：
 *   - 前端串行闸门：同一时刻只发出 1 路上游请求，避免组织并发上限（常为 1）触发 429；
 *   - AbortSignal：停止分析 / 新任务抢占时立刻取消排队与进行中的请求；
 *   - 429 退避重试：与后端闸门双保险。
 */

const LLM_MAX_RETRIES = 4
let activeAbort = null
let gateActive = 0
const gateWaiters = []

export function createAbortError(message = '分析已中断') {
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

export function isAbortError(err) {
  const code = err?.code
  const msg = String(err?.message || '')
  return (
    err?.name === 'AbortError' ||
    err?.name === 'CanceledError' ||
    code === 'ERR_CANCELED' ||
    (code === 'ECONNABORTED' && /aborted|canceled|cancelled/i.test(msg))
  )
}

/** 绑定当前分析会话的 AbortSignal（流水线内所有 LLM 调用共享）。 */
export function setLLMAbortSignal(signal) {
  activeAbort = signal || null
}

export function getLLMAbortSignal() {
  return activeAbort
}

export function throwIfLLMAborted() {
  if (activeAbort?.aborted) throw createAbortError()
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError()
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

function acquireGate(signal) {
  throwIfAborted(signal)
  if (gateActive === 0) {
    gateActive = 1
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const waiter = {
      grant() {
        gateActive = 1
        resolve()
      },
      reject
    }
    const onAbort = () => {
      const i = gateWaiters.indexOf(waiter)
      if (i >= 0) gateWaiters.splice(i, 1)
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
    gateWaiters.push(waiter)
  })
}

function releaseGate() {
  gateActive = 0
  const next = gateWaiters.shift()
  if (!next) return
  next.cleanup?.()
  next.grant()
}

async function withLlmGate(task, signal) {
  await acquireGate(signal)
  try {
    throwIfAborted(signal)
    return await task()
  } finally {
    releaseGate()
  }
}

function isRateLimitMessage(msg = '', status) {
  if (status === 429) return true
  return /HTTP 429|max organization concurrency|rate.?limit|too many requests/i.test(
    String(msg)
  )
}

function retryDelayMs(msg = '', attempt = 0) {
  const m = String(msg).match(/after\s+(\d+)\s+seconds?/i)
  if (m) return Math.min(Number(m[1]) * 1000, 30_000)
  return Math.min(1000 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 200)
}

function resolveSignal(explicit) {
  return explicit || activeAbort || undefined
}

/**
 * 调用大模型对话接口（经后端代理）
 * @param {Object} params
 * @param {string} params.system   系统提示词，用于设定 Agent 角色
 * @param {string} params.user     用户内容（待处理的数据）
 * @param {boolean} [params.json]  是否要求返回 JSON 格式
 * @param {number} [params.temperature] 采样温度
 * @param {string} [params.model]  模型 id（多模型时指定由哪个模型执行；缺省用后端默认）
 * @param {AbortSignal} [params.signal] 中断信号
 * @returns {Promise<string>} 模型返回的文本内容
 */
export async function callLLM({ system, user, json = false, temperature, model, signal }) {
  const abort = resolveSignal(signal)
  throwIfAborted(abort)

  if (isDemoMode()) {
    return withLlmGate(async () => {
      throwIfAborted(abort)
      return demoLLM({ system, user, model, signal: abort })
    }, abort)
  }

  return withLlmGate(async () => {
    let lastErr
    for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
      throwIfAborted(abort)
      try {
        const res = await axios.post(
          `${API_BASE}/llm`,
          { system, user, json, temperature, model },
          {
            timeout: 180000,
            headers: { 'Content-Type': 'application/json' },
            signal: abort
          }
        )

        const content = res?.data?.content
        if (!content) {
          throw new Error('模型返回内容为空')
        }
        return content.trim()
      } catch (err) {
        if (isAbortError(err) || abort?.aborted) throw createAbortError()
        const backendMsg = err?.response?.data?.error
        const status = err?.response?.status
        const msg = backendMsg || err.message || ''
        if (isRateLimitMessage(msg, status) && attempt < LLM_MAX_RETRIES) {
          await sleep(retryDelayMs(msg, attempt), abort)
          continue
        }
        lastErr = err
        if (backendMsg) throw new Error(backendMsg)
        if (err.code === 'ECONNABORTED') {
          throw new Error('LLM 调用超时，请重试。')
        }
        if (err.message?.includes('Network Error')) {
          throw new Error('无法连接后端服务，请先运行 `npm run server` 或 `npm run dev:all`。')
        }
        throw new Error(`LLM 调用异常：${err.message}`)
      }
    }
    throw lastErr || new Error('LLM 调用失败')
  }, abort)
}

/**
 * 流式调用大模型（经后端 SSE 代理），实时回传 token 与思考过程。
 * @param {Object} params
 * @param {string} params.system
 * @param {string} params.user
 * @param {number} [params.temperature]
 * @param {(text:string)=>void} [params.onToken]     正文 token 回调
 * @param {(text:string)=>void} [params.onReasoning] 思考链（deepseek-reasoner）回调
 * @param {string} [params.model] 模型 id
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<string>} 完整正文
 */
export async function callLLMStream({
  system,
  user,
  temperature,
  onToken,
  onReasoning,
  model,
  signal
}) {
  const abort = resolveSignal(signal)
  throwIfAborted(abort)

  if (isDemoMode()) {
    return withLlmGate(async () => {
      throwIfAborted(abort)
      return demoLLMStream({ system, user, onToken, onReasoning, signal: abort })
    }, abort)
  }

  return withLlmGate(async () => {
    let lastMsg = ''
    for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
      throwIfAborted(abort)
      const res = await fetch(`${API_BASE}/llm/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user, temperature, model }),
        signal: abort
      })

      if (!res.ok || !res.body) {
        let msg = `LLM 流式调用失败（HTTP ${res.status}）`
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch {
          /* ignore */
        }
        lastMsg = msg
        if (isRateLimitMessage(msg, res.status) && attempt < LLM_MAX_RETRIES) {
          await sleep(retryDelayMs(msg, attempt), abort)
          continue
        }
        throw new Error(msg)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let full = ''
      let errorMsg = ''

      const handleEvent = (event, dataStr) => {
        let data
        try {
          data = JSON.parse(dataStr)
        } catch {
          return
        }
        if (event === 'token') {
          full += data.text || ''
          onToken?.(data.text || '')
        } else if (event === 'reasoning') {
          onReasoning?.(data.text || '')
        } else if (event === 'done') {
          if (data.content) full = data.content
        } else if (event === 'error') {
          errorMsg = data.error || 'LLM 流式调用异常'
        }
      }

      try {
        while (true) {
          throwIfAborted(abort)
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const chunks = buffer.split('\n\n')
          buffer = chunks.pop() || ''

          for (const chunk of chunks) {
            const lines = chunk.split('\n')
            let event = 'message'
            let dataStr = ''
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
            }
            if (dataStr) handleEvent(event, dataStr)
          }
        }
      } catch (err) {
        if (isAbortError(err) || abort?.aborted) throw createAbortError()
        throw err
      } finally {
        try {
          await reader.cancel()
        } catch {
          /* ignore */
        }
      }

      if (errorMsg) {
        lastMsg = errorMsg
        if (isRateLimitMessage(errorMsg) && attempt < LLM_MAX_RETRIES) {
          await sleep(retryDelayMs(errorMsg, attempt), abort)
          continue
        }
        throw new Error(errorMsg)
      }
      return full.trim()
    }
    throw new Error(lastMsg || 'LLM 流式调用失败')
  }, abort)
}

/**
 * 安全解析 LLM 返回的 JSON。
 * 兼容模型偶尔携带 ```json 代码块包裹的情况。
 * @param {string} text
 * @returns {Object}
 */
export function parseJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    // 尝试提取被代码块包裹的 JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        throw new Error('数据解析异常，请重试')
      }
    }
    throw new Error('数据解析异常，请重试')
  }
}

/**
 * 获取后端已配置的可用模型列表（用于前端"参与协作的模型"选择器）。
 * @returns {Promise<Array<{id:string, label:string, model:string}>>}
 */
export async function fetchModels() {
  // 离线演示模式：返回预置演示模型列表
  if (isDemoMode()) {
    return DEMO_MODELS
  }
  try {
    const res = await axios.get(`${API_BASE}/models`, { timeout: 8000 })
    const models = res?.data?.models
    return Array.isArray(models) ? models : []
  } catch {
    return []
  }
}
