import { callLLM, parseJSON } from '../services/llmService.js'
import { analyzeLocalSentiment, fuseSentiment } from '../utils/localSentiment.js'
import { LOCAL_SENTIMENT_CONFIG } from '../config.js'

/**
 * 分析 Agent
 * ---------------------------------------------------
 * 职责：情感分析（正/负/中性）、关键词提取、核心观点挖掘。
 * 输入：清洗 Agent 输出的有效文本列表
 * 输出：JSON（情感占比、关键词、观点总结）
 * 依赖：调用大模型 API
 */

const SYSTEM_PROMPT = `你是一个专业的舆情分析师。请分析给定的舆情文本列表，输出结构化结果。
只返回 JSON，格式如下：
{
  "sentiment": { "positive": 数字, "negative": 数字, "neutral": 数字 },   // 三者为百分比，加起来等于100
  "keywords": [ { "word": "关键词", "weight": 数字 }, ... ],              // 提取8-15个关键词，weight为出现热度1-100
  "opinions": [ "核心观点1", "核心观点2", ... ]                          // 提炼3-5条核心观点
}
不要输出任何多余说明。`

/**
 * 单个模型执行一次分析
 * @param {string[]} cleanedList
 * @param {{id:string, label:string}} model
 */
async function analyzeOne(cleanedList, model) {
  const user = `待分析舆情文本列表（JSON 数组）：\n${JSON.stringify(cleanedList, null, 2)}`

  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.3,
    model: model?.id
  })

  const data = parseJSON(content)
  return {
    sentiment: data.sentiment || { positive: 0, negative: 0, neutral: 0 },
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    opinions: Array.isArray(data.opinions) ? data.opinions : []
  }
}

/**
 * 集成多个模型的分析结果：
 *   - 情感占比取各模型均值（再归一化到 100）；
 *   - 关键词按词合并，权重取最大值；
 *   - 观点去重合并。
 */
function ensembleAnalyze(results) {
  const n = results.length || 1

  // 情感均值
  const sentiment = { positive: 0, negative: 0, neutral: 0 }
  for (const r of results) {
    sentiment.positive += r.sentiment.positive || 0
    sentiment.negative += r.sentiment.negative || 0
    sentiment.neutral += r.sentiment.neutral || 0
  }
  for (const k of Object.keys(sentiment)) sentiment[k] = Math.round(sentiment[k] / n)
  // 归一化：修正因四舍五入导致的合计偏差
  const sum = sentiment.positive + sentiment.negative + sentiment.neutral
  if (sum !== 100 && sum > 0) {
    sentiment.neutral += 100 - sum
  }

  // 关键词合并（同词取最大权重）
  const kwMap = new Map()
  for (const r of results) {
    for (const kw of r.keywords) {
      const word = kw?.word
      if (!word) continue
      const weight = Number(kw.weight) || 0
      kwMap.set(word, Math.max(kwMap.get(word) || 0, weight))
    }
  }
  const keywords = [...kwMap.entries()]
    .map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 15)

  // 观点去重合并
  const opSet = new Set()
  const opinions = []
  for (const r of results) {
    for (const op of r.opinions) {
      const t = String(op || '').trim()
      if (t && !opSet.has(t)) {
        opSet.add(t)
        opinions.push(t)
      }
    }
  }

  return { sentiment, keywords, opinions }
}

/**
 * @param {string[]} cleanedList 清洗后的文本列表
 * @param {Array<{id:string, label:string}>} [models] 参与协作分析的模型；
 *        传入多个时，各模型独立分析后集成，得到更稳健的结论。
 * @returns {Promise<{sentiment:Object, keywords:Array, opinions:Array, contributors:Array}>}
 */
export async function analyzeAgent(cleanedList, models) {
  const list = Array.isArray(models) && models.length ? models : [undefined]

  // 各模型并行独立分析；单个模型失败不影响其余（至少保留一个成功结果）。
  const settled = await Promise.allSettled(
    list.map((m) => analyzeOne(cleanedList, m))
  )

  const results = []
  const contributors = []
  settled.forEach((s, i) => {
    const label = list[i]?.label || '默认模型'
    if (s.status === 'fulfilled') {
      results.push(s.value)
      contributors.push({ label, sentiment: s.value.sentiment, ok: true })
    } else {
      contributors.push({ label, ok: false, error: s.reason?.message || '调用失败' })
    }
  })

  if (results.length === 0) {
    throw new Error('所有模型分析均失败，请检查模型配置或稍后重试')
  }

  const merged = ensembleAnalyze(results)

  // 本地情感中间件：以中文情感词典对文本做一次本地分析，作为校准锚点与 LLM 结果融合。
  let localSentiment = null
  if (LOCAL_SENTIMENT_CONFIG.enabled) {
    const local = analyzeLocalSentiment(cleanedList)
    localSentiment = { ...local, weight: LOCAL_SENTIMENT_CONFIG.weight }
    const llmSentiment = merged.sentiment
    merged.sentiment = fuseSentiment(llmSentiment, local, LOCAL_SENTIMENT_CONFIG.weight)
    // 作为一个「贡献者」展示（区别于大模型：kind = 'local'）
    contributors.push({
      label: '本地情感词典',
      sentiment: local.sentiment,
      coverage: local.coverage,
      analyzed: local.analyzed,
      kind: 'local',
      ok: true
    })
  }

  return { ...merged, contributors, localSentiment }
}
