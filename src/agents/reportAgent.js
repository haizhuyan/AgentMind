import { callLLM } from '../services/llmService.js'
import { callLLMStream } from '../services/llmService.js'

/**
 * 报告 Agent
 * ---------------------------------------------------
 * 职责：整合所有智能体结果，生成正式、简洁的舆情分析报告。
 * 输入：采集、清洗、分析、洞察的所有结果
 * 输出：Markdown 文本格式的舆情报告
 * 依赖：调用大模型 API
 */

const SYSTEM_PROMPT = `你是一个专业的舆情报告撰写专家。请整合各智能体的分析结果，
撰写一份正式、简洁、条理清晰的舆情分析报告。
要求：
1. 使用 Markdown 格式，包含标题分段：## 舆情概况、## 情感分析、## 深度洞察、## 趋势与风险、## 应对建议；
2. 关键风险点、核心诉求要清晰列出；
3. 报告中引用具体事实/观点时，请在句末用 [n] 标注对应的来源编号（n 为下方【信息来源】列表的序号）；
4. 若提供了辩论/交叉验证结论，请在报告末尾附「## 结论溯源」说明可信度；
5. 语言专业、精炼，避免空话。直接输出报告正文，不要额外解释。`

/**
 * @param {Object} ctx 全流程上下文
 * @param {string} ctx.keyword
 * @param {string[]} ctx.cleaned
 * @param {Object} ctx.analyze
 * @param {Object} ctx.insight
 * @param {Object} [ctx.trend]   趋势预测结果
 * @param {Object} [ctx.debate]  辩论/交叉验证结果
 * @param {Array}  [ctx.sources] 采集来源列表（用于溯源标注）
 * @param {Object} [ctx.stream]  流式回调 { onToken, onReasoning }
 * @returns {Promise<string>} Markdown 报告
 */
export async function reportAgent(ctx) {
  const { keyword, cleaned, analyze, insight, trend, debate, sources, stream } = ctx

  // 构造带编号的来源清单，供模型在报告中引用 [n]
  const sourceList = Array.isArray(sources) ? sources : []
  const sourceText = sourceList.length
    ? sourceList
        .map((s, i) => `[${i + 1}] ${s.title || ''}（${s.displayUrl || s.url || ''}）`)
        .join('\n')
    : '无'

  const user = `请基于以下数据生成舆情分析报告：
【关键词】${keyword}
【有效样本量】${cleaned?.length || 0} 条
【情感与观点分析】${JSON.stringify(analyze)}
【深度洞察】${JSON.stringify(insight)}
【趋势预测】${trend ? JSON.stringify(trend) : '无'}
【多Agent辩论/交叉验证】${debate ? JSON.stringify(debate) : '无'}
【信息来源】（引用时用 [编号] 标注）
${sourceText}`

  // 若提供流式回调，则用流式接口实时回传 token 与思考过程
  if (stream?.onToken || stream?.onReasoning) {
    return callLLMStream({
      system: SYSTEM_PROMPT,
      user,
      temperature: 0.6,
      onToken: stream.onToken,
      onReasoning: stream.onReasoning
    })
  }

  const content = await callLLM({
    system: SYSTEM_PROMPT,
    user,
    temperature: 0.6
  })

  return content
}
