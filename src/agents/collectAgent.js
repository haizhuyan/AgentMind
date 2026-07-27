import { collectReal } from '../services/collectService.js'

/**
 * 采集 Agent
 * ---------------------------------------------------
 * 职责：获取舆情原始文本与来源（真实数据源）。
 * 输入：关键词
 * 输出：{ texts, sources, aiSummary }
 * 依赖：后端 Bocha 博查 AI 搜索（不调用 LLM）
 *
 * 采集失败会抛出异常，不使用任何模拟/兜底数据。
 */

/**
 * @param {string} keyword 舆情关键词
 * @returns {Promise<{texts:string[], sources:Array, aiSummary:string}>}
 */
export async function collectAgent(keyword) {
  const kw = keyword.trim()
  const result = await collectReal(kw)

  if (!result?.texts || result.texts.length === 0) {
    throw new Error(`采集 Agent 未获取到「${kw}」的舆情数据，请更换关键词或检查数据源配置。`)
  }
  return result
}
