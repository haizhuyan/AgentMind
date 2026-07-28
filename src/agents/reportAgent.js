import { callLLM } from '../services/llmService.js'
import { callLLMStream } from '../services/llmService.js'
import { getTemplate } from '../report/templates.js'

/**
 * 报告 Agent
 * ---------------------------------------------------
 * 职责：整合所有智能体结果，按选定模板的章节大纲生成结构化舆情分析报告。
 * 输入：采集、清洗、分析、洞察的所有结果 + 报告模板
 * 输出：Markdown 文本格式的舆情报告（章节结构与模板对齐，便于 IR 化）
 * 依赖：调用大模型 API
 */

/** 依据模板章节大纲构造系统提示词，引导模型产出可 IR 化的结构化报告。 */
function buildSystemPrompt(template) {
  const outline = template.sections
    .map((s, i) => `${i + 1}. ## ${s.title}——${s.guide}`)
    .join('\n')
  return `你是一个专业的舆情报告撰写专家。请整合各智能体的分析结果，
撰写一份《${template.name}》，正式、简洁、条理清晰。
要求：
1. 严格使用 Markdown 格式，并严格按以下章节大纲组织（每个章节用 "## 章节名" 作为标题，顺序与命名保持一致）：
${outline}
2. 关键风险点、核心诉求等要用列表清晰列出；
3. 报告中引用具体事实/观点时，请在句末用 [n] 标注对应的来源编号（n 为下方【信息来源】列表的序号）；
4. 若提供了辩论/交叉验证结论，请在报告末尾追加一节 "## 结论溯源" 说明可信度；
5. 语言专业、精炼，避免空话。直接输出报告正文，不要额外解释。`
}

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
 * @param {string} [ctx.templateId] 报告模板 id（决定章节大纲）
 * @returns {Promise<string>} Markdown 报告
 */
export async function reportAgent(ctx) {
  const { keyword, cleaned, analyze, insight, trend, debate, sources, stream, model, templateId } = ctx

  const template = getTemplate(templateId)
  const systemPrompt = buildSystemPrompt(template)

  // 构造带编号的来源清单，供模型在报告中引用 [n]
  const sourceList = Array.isArray(sources) ? sources : []
  const sourceText = sourceList.length
    ? sourceList
        .map((s, i) => `[${i + 1}] ${s.title || ''}（${s.displayUrl || s.url || ''}）`)
        .join('\n')
    : '无'

  const user = `请基于以下数据，按《${template.name}》的章节大纲生成舆情分析报告：
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
      system: systemPrompt,
      user,
      temperature: 0.6,
      model: model?.id,
      onToken: stream.onToken,
      onReasoning: stream.onReasoning
    })
  }

  const content = await callLLM({
    system: systemPrompt,
    user,
    temperature: 0.6,
    model: model?.id
  })

  return content
}
