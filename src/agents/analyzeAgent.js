import { callLLM, parseJSON } from '../services/llmService.js'

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
 * @param {string[]} cleanedList 清洗后的文本列表
 * @returns {Promise<{sentiment:Object, keywords:Array, opinions:Array}>}
 */
export async function analyzeAgent(cleanedList) {
  const user = `待分析舆情文本列表（JSON 数组）：\n${JSON.stringify(cleanedList, null, 2)}`

  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.3
  })

  const data = parseJSON(content)

  // 数据兜底与校验
  const sentiment = data.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = Array.isArray(data.keywords) ? data.keywords : []
  const opinions = Array.isArray(data.opinions) ? data.opinions : []

  return { sentiment, keywords, opinions }
}
