import { callLLM, parseJSON, throwIfLLMAborted } from '../services/llmService.js'

/**
 * 清洗 Agent
 * ---------------------------------------------------
 * 职责：去重、过滤广告、无效短句、冗余内容。
 * 输入：采集 Agent 输出的原始文本列表
 * 输出：清洗后的有效文本列表
 * 依赖：调用大模型 API
 *
 * 优化（应对大数据量超时）：
 *   1) 本地预清洗（纯 JS，瞬时）：去重、去超短句、去明显广告、截断超长文本，
 *      大幅削减送入 LLM 的数据量；
 *   2) 分批并行清洗：预清洗后按批拆分，限并发调用 LLM，单请求体小、返回快，
 *      避免"一次性塞入全部文本"导致的超时；
 *   3) 优雅降级：某一批 LLM 失败时回退用该批预清洗结果，不中断整个流程。
 */

const SYSTEM_PROMPT = `你是一个舆情数据清洗专家。请对给定的舆情文本列表进行清洗：
1. 去除完全重复或高度相似的内容；
2. 过滤广告、营销、引流类文本；
3. 剔除无实际信息量的过短或无效短句；
4. 保留真实用户观点、评价、吐槽、讨论。
只返回 JSON，格式为：{"cleaned": ["文本1", "文本2", ...]}。不要输出任何多余说明。`

// 单批送入 LLM 的最大条数（控制单请求体积，规避超时）
const CHUNK_SIZE = 15
// LLM 并发批次上限：组织级并发常为 1，超限即 429；后端亦有串行闸门兜底
const MAX_CONCURRENCY = 1
// 单条文本最大保留长度（截断超长正文，降低 token 消耗）
const MAX_ITEM_LEN = 300

// 明显的广告/引流关键词（本地预过滤）
const AD_PATTERNS =
  /(加微信|加\s*v|扫码|优惠券|领取|包邮|下单|点击链接|广告|推广|代理|招商|加盟|返现|折扣|秒杀|https?:\/\/\S+|www\.)/i

/** 归一化文本用于近似去重（去空白/标点/大小写） */
function normalizeKey(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?;:："'“”‘’（）()\[\]{}<>~`|\\/@#￥%…&*\-_=+]/g, '')
    .slice(0, 80)
}

/**
 * 本地预清洗：去重 + 去超短句 + 去明显广告 + 截断超长文本。
 * @param {string[]} rawList
 * @returns {string[]}
 */
export function preClean(rawList = []) {
  const seen = new Set()
  const out = []
  for (const item of rawList) {
    let t = String(item || '').trim()
    if (!t) continue
    // 截断超长文本
    if (t.length > MAX_ITEM_LEN) t = t.slice(0, MAX_ITEM_LEN)
    // 过短无效
    if (t.length < 6) continue
    // 明显广告
    if (AD_PATTERNS.test(t)) continue
    // 近似去重
    const key = normalizeKey(t)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/** 将数组按大小分块 */
function chunk(arr, size) {
  const res = []
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size))
  return res
}

/** 限并发执行任务（每个任务是返回 Promise 的函数） */
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length)
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++
      try {
        throwIfLLMAborted()
        results[idx] = { status: 'fulfilled', value: await tasks[idx]() }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        results[idx] = { status: 'rejected', reason: err }
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker)
  await Promise.allSettled(workers)
  throwIfLLMAborted()
  return results
}

/** 对单批文本调用 LLM 清洗 */
async function cleanChunk(batch, model) {
  const user = `原始舆情文本列表（JSON 数组）：\n${JSON.stringify(batch, null, 2)}`
  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.2,
    model: model?.id
  })
  const data = parseJSON(content)
  return Array.isArray(data.cleaned) ? data.cleaned : []
}

/**
 * @param {string[]} rawList 原始文本列表
 * @param {{id?:string}} [model] 执行清洗的主模型
 * @returns {Promise<string[]>} 清洗后的文本列表
 */
export async function cleanAgent(rawList, model) {
  // 1) 本地预清洗
  const pre = preClean(rawList)
  if (pre.length === 0) {
    throw new Error('清洗结果为空（预清洗后无有效文本），请更换关键词或检查数据源')
  }

  // 数据量小：单次清洗即可（保持原行为，避免不必要的多请求）
  if (pre.length <= CHUNK_SIZE) {
    try {
      const cleaned = await cleanChunk(pre, model)
      return cleaned.length ? cleaned : pre
    } catch (err) {
      throwIfLLMAborted()
      if (err?.name === 'AbortError') throw err
      // LLM 失败时退回预清洗结果，保证流程不中断
      return pre
    }
  }

  // 2) 数据量大：分批 + 限并发清洗
  const batches = chunk(pre, CHUNK_SIZE)
  const settled = await runWithConcurrency(
    batches.map((b) => () => cleanChunk(b, model)),
    MAX_CONCURRENCY
  )

  // 3) 合并结果 + 优雅降级 + 跨批去重
  const merged = []
  const seen = new Set()
  settled.forEach((s, i) => {
    // 该批成功用 LLM 结果，失败则回退该批预清洗文本
    const list =
      s.status === 'fulfilled' && Array.isArray(s.value) && s.value.length
        ? s.value
        : batches[i]
    for (const t of list) {
      const key = normalizeKey(t)
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(t)
    }
  })

  if (merged.length === 0) {
    throw new Error('清洗结果为空，请重试')
  }
  return merged
}
