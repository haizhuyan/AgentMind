import { callLLM, parseJSON } from '../services/llmService.js'

/**
 * forumHost.js —— 论坛主持人（ForumEngine Host）
 * ---------------------------------------------------
 * 参考 BettaFish 的 ForumEngine/llm_host.py 设计。
 * 职责：阅读本轮各「验证 Agent」的发言与当前结论，作为中立主持人
 *       归纳共识、点明分歧、纠正明显错误，并提出 1-3 个需要在下一轮
 *       深入的关键问题，引导论坛讨论持续收敛。
 * 依赖：调用大模型 API（建议使用主模型担任主持人）。
 */

const HOST_SYSTEM_PROMPT = `你是一个多智能体舆情分析「论坛」的主持人，主持多个验证 Agent 对同一舆情结论的讨论。
你的职责：
1. 事件梳理：从各 Agent 发言中提炼当前讨论的核心事实与焦点；
2. 观点整合：归纳各 Agent 的共识（consensus）；
3. 分歧点名：明确指出各 Agent 之间、以及与原始结论之间的主要分歧（divergences）；
4. 纠错：若发现明显的事实错误或逻辑矛盾，纳入分歧并说明理由；
5. 引导：提出 1-3 个最值得下一轮深入探讨的关键问题（questions），推动结论收敛；
6. 聚焦：给出下一轮讨论应重点关注的方向（focus，一句话）。

要求客观中立、基于事实，不情绪化。只返回 JSON，格式如下：
{
  "summary": "本轮讨论的核心梳理（一段话）",
  "consensus": [ "共识1", "共识2" ],
  "divergences": [ "分歧1", "分歧2" ],
  "questions": [ "下一轮关键问题1", "关键问题2" ],
  "focus": "下一轮讨论应重点关注的方向（一句话）"
}
不要输出任何多余说明。`

/**
 * 主持人生成一次引导发言。
 * @param {Object} params
 * @param {string} params.keyword         舆情关键词
 * @param {number} params.round           当前轮次（从 1 开始）
 * @param {Object} params.analyze         当前分析结论
 * @param {Object} params.insight         当前洞察结论
 * @param {Array<{label:string, content:string}>} params.speeches 本轮各 Agent 发言
 * @param {{id?:string, label?:string}} [params.model] 担任主持人的模型（建议主模型）
 * @returns {Promise<{summary:string, consensus:string[], divergences:string[], questions:string[], focus:string}>}
 */
export async function forumHost({ keyword, round, analyze, insight, speeches, model }) {
  const speechText = (speeches || [])
    .map((s) => `【${s.label}】${s.content}`)
    .join('\n\n')

  const user = `舆情关键词：${keyword}
当前轮次：第 ${round} 轮
当前分析结论：${JSON.stringify(analyze)}
当前洞察结论：${JSON.stringify(insight)}

本轮各验证 Agent 的发言：
${speechText || '（本轮暂无有效发言）'}

请作为主持人归纳共识与分歧，并提出下一轮应深入的关键问题。`

  const content = await callLLM({
    system: HOST_SYSTEM_PROMPT,
    user,
    json: true,
    temperature: 0.4,
    model: model?.id
  })

  const data = parseJSON(content)
  return {
    summary: data.summary || '',
    consensus: Array.isArray(data.consensus) ? data.consensus : [],
    divergences: Array.isArray(data.divergences) ? data.divergences : [],
    questions: Array.isArray(data.questions) ? data.questions : [],
    focus: data.focus || ''
  }
}
