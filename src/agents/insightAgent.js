import { callLLM, parseJSON } from '../services/llmService.js'

/**
 * 洞察 Agent
 * ---------------------------------------------------
 * 职责：分析舆情趋势、潜在风险、用户核心诉求、舆情爆发原因。
 * 输入：分析 Agent 输出的分析结果
 * 输出：JSON（趋势、风险、诉求）
 * 依赖：调用大模型 API
 */

const SYSTEM_PROMPT = `你是一个资深舆情洞察顾问。基于给定的舆情分析结果，进行深度洞察。
只返回 JSON，格式如下：
{
  "trend": "舆情趋势判断（一段话）",
  "risks": [ "潜在风险点1", "潜在风险点2", ... ],
  "demands": [ "用户核心诉求1", "用户核心诉求2", ... ],
  "cause": "舆情爆发/走向的核心原因分析"
}
不要输出任何多余说明。`

/**
 * @param {Object} analyzeResult 分析 Agent 的输出
 * @param {string} keyword 舆情关键词
 * @returns {Promise<{trend:string, risks:Array, demands:Array, cause:string}>}
 */
export async function insightAgent(analyzeResult, keyword) {
  const user = `舆情关键词：${keyword}\n分析结果（JSON）：\n${JSON.stringify(
    analyzeResult,
    null,
    2
  )}`

  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.5
  })

  const data = parseJSON(content)

  return {
    trend: data.trend || '',
    risks: Array.isArray(data.risks) ? data.risks : [],
    demands: Array.isArray(data.demands) ? data.demands : [],
    cause: data.cause || ''
  }
}
