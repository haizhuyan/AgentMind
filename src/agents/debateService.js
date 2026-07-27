import { callLLM, parseJSON } from '../services/llmService.js'

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
 * 执行交叉验证/辩论
 * @param {Object} params
 * @param {string} params.keyword
 * @param {Object} params.analyze  分析 Agent 结果
 * @param {Object} params.insight  洞察 Agent 结果
 * @returns {Promise<Object>} 辩论结论（含可信度与溯源说明）
 */
export async function debateService({ keyword, analyze, insight }) {
  const user = `舆情关键词：${keyword}
原始分析结论：${JSON.stringify(analyze)}
原始洞察结论：${JSON.stringify(insight)}`

  const content = await callLLM({
    system: CRITIC_PROMPT,
    user,
    json: true,
    temperature: 0.4
  })

  const critic = parseJSON(content)
  const gap = sentimentGap(analyze.sentiment, critic.sentiment)
  const hasDivergence = gap > DIVERGENCE_THRESHOLD || (critic.agreement ?? 100) < 70

  // 若显著分歧：取两方情感占比均值作为「校准结论」
  let calibratedSentiment = analyze.sentiment
  if (hasDivergence && critic.sentiment) {
    calibratedSentiment = {
      positive: Math.round((analyze.sentiment.positive + critic.sentiment.positive) / 2),
      negative: Math.round((analyze.sentiment.negative + critic.sentiment.negative) / 2),
      neutral: Math.round((analyze.sentiment.neutral + critic.sentiment.neutral) / 2)
    }
  }

  return {
    agreement: critic.agreement ?? 100,
    hasDivergence,
    disputes: Array.isArray(critic.disputes) ? critic.disputes : [],
    supplement: Array.isArray(critic.supplement) ? critic.supplement : [],
    calibratedSentiment,
    trace: hasDivergence
      ? `分析 Agent 与验证 Agent 存在分歧（情感偏差 ${gap} 个百分点，一致度 ${
          critic.agreement ?? '?'
        }%），已通过二次校准取均值，结论可溯源。`
      : `分析 Agent 与验证 Agent 结论高度一致（一致度 ${
          critic.agreement ?? 100
        }%），结论可信度高。`
  }
}
