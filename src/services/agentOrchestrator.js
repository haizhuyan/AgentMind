import { collectAgent } from '../agents/collectAgent.js'
import { cleanAgent } from '../agents/cleanAgent.js'
import { analyzeAgent } from '../agents/analyzeAgent.js'
import { insightAgent } from '../agents/insightAgent.js'
import { reportAgent } from '../agents/reportAgent.js'
import { debateService } from '../agents/debateService.js'
import { forumService } from '../agents/forumService.js'
import { trendPredict } from '../utils/trendPredict.js'
import { ENABLE_DEBATE, FORUM_CONFIG } from '../config.js'
import { getTemplate, DEFAULT_TEMPLATE_ID } from '../report/templates.js'
import { markdownToIR } from '../report/ir.js'

/**
 * agentOrchestrator.js —— 多智能体调度器
 * ---------------------------------------------------
 * 按「采集 → 清洗 → 分析 → 洞察 → (辩论) → 报告」顺序
 * 编排流水线，通过 onStep 回调实时反馈执行状态。
 *
 * 支持断点续跑：传入 resume = { pipeline, stepDetails } 时，
 * 已完成步骤直接复用已保存的中间产物（跳过重跑），
 * 从第一个未完成步骤继续执行。
 */

// 智能体步骤定义（供 UI 展示）
export const AGENT_STEPS = [
  { id: 'collect', name: '采集 Agent', desc: '获取舆情原始文本' },
  { id: 'clean', name: '清洗 Agent', desc: '去重、过滤广告与无效内容' },
  { id: 'analyze', name: '分析 Agent', desc: '情感分析、关键词与观点提取' },
  { id: 'insight', name: '洞察 Agent', desc: '趋势、风险与核心诉求挖掘' },
  { id: 'debate', name: '论坛协作', desc: '主持人引导多轮交叉验证与结论溯源' },
  { id: 'report', name: '报告 Agent', desc: '整合生成舆情分析报告' }
]

/**
 * 运行完整的多智能体分析流水线
 * @param {Object} params
 * @param {string} params.keyword 舆情关键词
 * @param {string} [params.rawText] 用户直接粘贴的舆情文本（提供则跳过联网采集）
 * @param {Array<{id:string, label:string}>} [params.models] 参与协作的模型列表。
 * @param {Object} [params.resume] 断点续跑状态 { pipeline, stepDetails }
 * @param {(stepId:string, status:string, detail?:Object, pipeline?:Object)=>void} params.onStep
 *        步骤回调；pipeline 为当前累计的流水线快照（供增量持久化）
 * @param {(evt:string, payload:any)=>void} [params.onReport] 报告流式回调
 * @param {string} [params.templateId] 报告模板 id
 * @param {string} [params.collectSource] 数据源 search | mindspider
 * @param {string} [params.collectPlatform] mindspider 平台
 * @returns {Promise<Object>} 完整分析结果
 */
export async function runAgentFlow({
  keyword,
  rawText,
  models,
  onStep,
  onReport,
  templateId,
  collectSource,
  collectPlatform,
  resume
}) {
  const report = onStep || (() => {})

  // ---- 模型角色分配 ----
  const selected = Array.isArray(models) && models.length ? models : [undefined]
  const primary = selected[0] // 主模型：清洗 / 洞察 / 报告
  const validators = selected.length > 1 ? selected.slice(1) : selected
  const labelOf = (m) => m?.label || '默认模型'

  // ---- 断点续跑：恢复已保存的流水线快照 ----
  const saved = resume?.pipeline || {}
  const savedDetails = resume?.stepDetails || {}
  const pipeline = {
    raw: Array.isArray(saved.raw) ? saved.raw : null,
    sources: Array.isArray(saved.sources) ? saved.sources : [],
    cleaned: Array.isArray(saved.cleaned) ? saved.cleaned : null,
    analyze: saved.analyze && typeof saved.analyze === 'object' ? saved.analyze : null,
    insight: saved.insight && typeof saved.insight === 'object' ? saved.insight : null,
    debate: saved.debate && typeof saved.debate === 'object' ? saved.debate : null,
    reportText: typeof saved.reportText === 'string' ? saved.reportText : ''
  }

  // 回传累计快照 + 已完成步骤的已保存详情
  const emit = (stepId, status, detail) => {
    report(stepId, status, detail, { ...pipeline })
  }
  const savedDetailOf = (stepId, fallback) => savedDetails[stepId]?.detail ?? fallback

  // ---- 1. 采集 ----
  if (pipeline.raw) {
    emit('collect', 'done', savedDetailOf('collect', { count: pipeline.raw.length, mode: '续跑恢复', samples: pipeline.raw.slice(0, 8) }))
  } else {
    report('collect', 'running')
    let raw
    if (rawText && rawText.trim()) {
      raw = rawText
        .split(/\r?\n|(?<=[。！？!?])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
      pipeline.raw = raw
      emit('collect', 'done', {
        count: raw.length,
        mode: '粘贴文本',
        samples: raw.slice(0, 8)
      })
    } else {
      const collected = await collectAgent(keyword, {
        source: collectSource || 'search',
        platform: collectPlatform
      })
      raw = collected.texts
      pipeline.raw = raw
      pipeline.sources = collected.sources || []
      emit('collect', 'done', {
        count: raw.length,
        mode: collectSource === 'mindspider' ? `MindSpider 爬虫（${collectPlatform || 'weibo'}）` : '联网搜索',
        sources: pipeline.sources.slice(0, 8),
        samples: raw.slice(0, 8)
      })
    }
  }
  const raw = pipeline.raw
  const sources = pipeline.sources

  // ---- 2. 清洗 ----
  if (pipeline.cleaned) {
    emit('clean', 'done', savedDetailOf('clean', { before: raw.length, after: pipeline.cleaned.length, samples: pipeline.cleaned.slice(0, 6) }))
  } else {
    report('clean', 'running', { _running: true, model: labelOf(primary), before: raw.length })
    pipeline.cleaned = await cleanAgent(raw, primary)
    emit('clean', 'done', {
      before: raw.length,
      after: pipeline.cleaned.length,
      samples: pipeline.cleaned.slice(0, 6)
    })
  }
  const cleaned = pipeline.cleaned

  // ---- 3. 分析 ----
  if (pipeline.analyze) {
    emit('analyze', 'done', savedDetailOf('analyze', {
      sentiment: pipeline.analyze.sentiment,
      keywords: (pipeline.analyze.keywords || []).slice(0, 10),
      opinions: pipeline.analyze.opinions || [],
      contributors: pipeline.analyze.contributors || []
    }))
  } else {
    report('analyze', 'running', { _running: true, models: selected.map(labelOf) })
    pipeline.analyze = await analyzeAgent(cleaned, selected)
    emit('analyze', 'done', {
      sentiment: pipeline.analyze.sentiment,
      keywords: (pipeline.analyze.keywords || []).slice(0, 10),
      opinions: pipeline.analyze.opinions || [],
      contributors: pipeline.analyze.contributors || []
    })
  }
  const analyze = pipeline.analyze

  // ---- 4. 洞察 ----
  if (pipeline.insight) {
    emit('insight', 'done', savedDetailOf('insight', {
      trend: pipeline.insight.trend,
      risks: pipeline.insight.risks || [],
      demands: pipeline.insight.demands || [],
      cause: pipeline.insight.cause
    }))
  } else {
    report('insight', 'running', { _running: true, model: labelOf(primary) })
    pipeline.insight = await insightAgent(analyze, keyword, primary)
    emit('insight', 'done', {
      trend: pipeline.insight.trend,
      risks: pipeline.insight.risks || [],
      demands: pipeline.insight.demands || [],
      cause: pipeline.insight.cause
    })
  }
  const insight = pipeline.insight

  // ---- 5. 论坛协作 / 交叉验证 ----
  let debate = null
  if (ENABLE_DEBATE) {
    if (pipeline.debate) {
      debate = pipeline.debate
      emit('debate', 'done', savedDetailOf('debate', {
        agreement: debate.agreement,
        hasDivergence: debate.hasDivergence,
        disputes: debate.disputes || [],
        supplement: debate.supplement || [],
        reviewers: debate.reviewers || [],
        rounds: debate.rounds || [],
        consensus: debate.consensus || [],
        questions: debate.questions || [],
        trace: debate.trace
      }))
    } else if (FORUM_CONFIG.enabled) {
      report('debate', 'running', {
        _running: true,
        _forum: true,
        host: labelOf(primary),
        reviewers: validators.map(labelOf),
        rounds: []
      })
      const liveRounds = []
      debate = await forumService({
        keyword,
        analyze,
        insight,
        validators,
        host: primary,
        rounds: FORUM_CONFIG.rounds,
        onRound: (round, payload) => {
          liveRounds.push(payload)
          report('debate', 'running', {
            _running: true,
            _forum: true,
            host: labelOf(primary),
            reviewers: validators.map(labelOf),
            rounds: [...liveRounds]
          })
        }
      })
      pipeline.debate = debate
      if (debate.calibratedSentiment) {
        analyze.sentiment = debate.calibratedSentiment
      }
      emit('debate', 'done', {
        agreement: debate.agreement,
        hasDivergence: debate.hasDivergence,
        disputes: debate.disputes || [],
        supplement: debate.supplement || [],
        reviewers: debate.reviewers || [],
        rounds: debate.rounds || [],
        consensus: debate.consensus || [],
        questions: debate.questions || [],
        trace: debate.trace
      })
    } else {
      report('debate', 'running', { _running: true, reviewers: validators.map(labelOf) })
      debate = await debateService({ keyword, analyze, insight, validators })
      pipeline.debate = debate
      if (debate.calibratedSentiment) {
        analyze.sentiment = debate.calibratedSentiment
      }
      emit('debate', 'done', {
        agreement: debate.agreement,
        hasDivergence: debate.hasDivergence,
        disputes: debate.disputes || [],
        supplement: debate.supplement || [],
        reviewers: debate.reviewers || [],
        rounds: debate.rounds || [],
        consensus: debate.consensus || [],
        questions: debate.questions || [],
        trace: debate.trace
      })
    }
  } else {
    report('debate', 'skipped')
  }

  // ---- 本地趋势推演 ----
  const trend = trendPredict({ analyze, insight })

  // ---- 6. 报告（流式生成）----
  const template = getTemplate(templateId || DEFAULT_TEMPLATE_ID)
  let reportText = pipeline.reportText
  if (reportText) {
    const ir = markdownToIR(reportText, {
      keyword,
      templateId: template.id,
      templateName: template.name,
      accent: template.accent,
      riskLevel: trend?.riskLevel || null
    })
    emit('report', 'done', savedDetailOf('report', { length: reportText.length, template: template.name, sections: ir.sections.length }))
    return { keyword, raw, cleaned, analyze, insight, trend, debate, sources, report: reportText, ir, templateId: template.id }
  }

  report('report', 'running', { _running: true, model: labelOf(primary), template: template.name })
  reportText = await reportAgent({
    keyword,
    cleaned,
    analyze,
    insight,
    trend,
    debate,
    sources,
    model: primary,
    templateId: template.id,
    stream: onReport
      ? {
          onToken: (t) => onReport('token', t),
          onReasoning: (t) => onReport('reasoning', t)
        }
      : undefined
  })
  pipeline.reportText = reportText

  // ---- 报告 IR 化 ----
  const ir = markdownToIR(reportText, {
    keyword,
    templateId: template.id,
    templateName: template.name,
    accent: template.accent,
    riskLevel: trend?.riskLevel || null
  })
  emit('report', 'done', { length: reportText.length, template: template.name, sections: ir.sections.length })

  return { keyword, raw, cleaned, analyze, insight, trend, debate, sources, report: reportText, ir, templateId: template.id }
}
