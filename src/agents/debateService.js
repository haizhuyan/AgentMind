import { callLLM, parseJSON, throwIfLLMAborted } from '../services/llmService.js'

/**
 * debateService.js —— 多智能体交叉验证/辩论服务
 * ---------------------------------------------------
 * 职责：让「验证 Agent」以独立视角复核「分析 + 洞察」结论，
 *       当结论偏差超过阈值时触发二次验证，并生成可溯源说明。
 * 依赖：调用大模型 API
 */

const CRITIC_PROMPT = `你是一个独立的舆情质检/辩论 Agent，负责对已有的分析与洞察结论进行交叉验证。
请以批判视角，独立判断情感占比是否合理、风险与诉求是否被遗漏或夸大。
只返回 JSON，格式如下：
{
  "sentiment": { "positive": 数字, "negative": 数字, "neutral": 数字 },  // 你独立评估的情感占比，合计100
  "agreement": 数字,                    // 你与原结论的一致度，0-100
  "disputes": [ "分歧点1", "分歧点2" ], // 与原结论的主要分歧
  "supplement": [ "被遗漏的风险或诉求" ] // 你认为需要补充的要点
}
不要输出多余说明。`

// 情感占比偏差阈值（百分点），超过则判定为显著分歧
const DIVERGENCE_THRESHOLD = 15

function sentimentGap(a = {}, b = {}) {
  const keys = ['positive', 'negative', 'neutral']
  return Math.max(...keys.map((k) => Math.abs((a[k] || 0) - (b[k] || 0))))
}

/**
 * 单个验证模型独立复核一次
 * @param {{id?:string, label?:string}} model
 * @param {string} user
 */
async function criticOne(model, user) {
  const content = await callLLM({
    system: CRITIC_PROMPT,
    user,
    json: true,
    temperature: 0.4,
    model: model?.id
  })
  return parseJSON(content)
}

/**
 * 执行交叉验证/辩论（支持多模型协作）
 * @param {Object} params
 * @param {string} params.keyword
 * @param {Object} params.analyze  分析 Agent 结果
 * @param {Object} params.insight  洞察 Agent 结果
 * @param {Array<{id:string, label:string}>} [params.validators] 参与复核的验证模型；
 *        建议使用与分析主模型不同的模型，实现跨模型独立质检。
 * @returns {Promise<Object>} 辩论结论（含可信度与溯源说明）
 */
export async function debateService({ keyword, analyze, insight, validators }) {
  const user = `舆情关键词：${keyword}
原始分析结论：${JSON.stringify(analyze)}
原始洞察结论：${JSON.stringify(insight)}`

  const list = Array.isArray(validators) && validators.length ? validators : [undefined]

  // 各验证模型并行独立复核；失败的模型跳过。
  const settled = await Promise.allSettled(list.map((m) => criticOne(m, user)))
  throwIfLLMAborted()

  const critics = []
  const reviewers = []
  settled.forEach((s, i) => {
    const label = list[i]?.label || '验证模型'
    if (s.status === 'fulfilled') {
      critics.push(s.value)
      reviewers.push({
        label,
        agreement: s.value.agreement ?? 100,
        sentiment: s.value.sentiment,
        ok: true
      })
    } else {
      reviewers.push({ label, ok: false, error: s.reason?.message || '复核失败' })
    }
  })

  if (critics.length === 0) {
    return {
      agreement: 100,
      hasDivergence: false,
      disputes: [],
      supplement: [],
      reviewers,
      calibratedSentiment: analyze.sentiment,
      trace: '验证模型均未成功返回，本次未做交叉校准。'
    }
  }

  // 聚合多模型复核结果
  const agreement = Math.round(
    critics.reduce((sum, c) => sum + (c.agreement ?? 100), 0) / critics.length
  )

  // 情感占比：多模型均值
  const avgSentiment = { positive: 0, negative: 0, neutral: 0 }
  let sCount = 0
  for (const c of critics) {
    if (c.sentiment) {
      avgSentiment.positive += c.sentiment.positive || 0
      avgSentiment.negative += c.sentiment.negative || 0
      avgSentiment.neutral += c.sentiment.neutral || 0
      sCount++
    }
  }
  const criticSentiment = sCount
    ? {
        positive: Math.round(avgSentiment.positive / sCount),
        negative: Math.round(avgSentiment.negative / sCount),
        neutral: Math.round(avgSentiment.neutral / sCount)
      }
    : null

  // 合并分歧点与补充项（去重）
  const disputes = [...new Set(critics.flatMap((c) => (Array.isArray(c.disputes) ? c.disputes : [])))]
  const supplement = [
    ...new Set(critics.flatMap((c) => (Array.isArray(c.supplement) ? c.supplement : [])))
  ]

  const gap = criticSentiment ? sentimentGap(analyze.sentiment, criticSentiment) : 0
  const hasDivergence = gap > DIVERGENCE_THRESHOLD || agreement < 70

  // 若显著分歧：取原结论与验证均值的均值作为「校准结论」
  let calibratedSentiment = analyze.sentiment
  if (hasDivergence && criticSentiment) {
    calibratedSentiment = {
      positive: Math.round((analyze.sentiment.positive + criticSentiment.positive) / 2),
      negative: Math.round((analyze.sentiment.negative + criticSentiment.negative) / 2),
      neutral: Math.round((analyze.sentiment.neutral + criticSentiment.neutral) / 2)
    }
  }

  const reviewerNames = reviewers
    .filter((r) => r.ok)
    .map((r) => r.label)
    .join('、')

  return {
    agreement,
    hasDivergence,
    disputes,
    supplement,
    reviewers,
    calibratedSentiment,
    trace: hasDivergence
      ? `分析结论与验证模型（${reviewerNames}）存在分歧（情感偏差 ${gap} 个百分点，平均一致度 ${agreement}%），已通过跨模型二次校准取均值，结论可溯源。`
      : `分析结论与验证模型（${reviewerNames}）结论高度一致（平均一致度 ${agreement}%），多模型交叉验证通过，可信度高。`
  }
}
