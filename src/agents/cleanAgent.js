import { callLLM, parseJSON } from '../services/llmService.js'

/**
 * 清洗 Agent
 * ---------------------------------------------------
 * 职责：去重、过滤广告、无效短句、冗余内容。
 * 输入：采集 Agent 输出的原始文本列表
 * 输出：清洗后的有效文本列表
 * 依赖：调用大模型 API
 */

const SYSTEM_PROMPT = `你是一个舆情数据清洗专家。请对给定的舆情文本列表进行清洗：
1. 去除完全重复或高度相似的内容；
2. 过滤广告、营销、引流类文本；
3. 剔除无实际信息量的过短或无效短句；
4. 保留真实用户观点、评价、吐槽、讨论。
只返回 JSON，格式为：{"cleaned": ["文本1", "文本2", ...]}。不要输出任何多余说明。`

/**
 * @param {string[]} rawList 原始文本列表
 * @param {{id?:string}} [model] 执行清洗的主模型
 * @returns {Promise<string[]>} 清洗后的文本列表
 */
export async function cleanAgent(rawList, model) {
  const user = `原始舆情文本列表（JSON 数组）：\n${JSON.stringify(rawList, null, 2)}`

  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.2,
    model: model?.id
  })

  const data = parseJSON(content)
  const cleaned = Array.isArray(data.cleaned) ? data.cleaned : []

  if (cleaned.length === 0) {
    throw new Error('清洗结果为空，请重试')
  }
  return cleaned
}
