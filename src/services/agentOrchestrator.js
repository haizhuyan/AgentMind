import { collectAgent } from '../agents/collectAgent.js'
import { cleanAgent } from '../agents/cleanAgent.js'
import { analyzeAgent } from '../agents/analyzeAgent.js'
import { insightAgent } from '../agents/insightAgent.js'
import { reportAgent } from '../agents/reportAgent.js'
import { debateService } from '../agents/debateService.js'
import { trendPredict } from '../utils/trendPredict.js'
import { ENABLE_DEBATE } from '../config.js'

/**
 * agentOrchestrator.js —— 多智能体调度器
 * ---------------------------------------------------
 * 按「采集 → 清洗 → 分析 → 洞察 → (辩论) → 报告」顺序
 * 编排流水线，通过 onStep 回调实时反馈执行状态。
 */

// 智能体步骤定义（供 UI 展示）
export const AGENT_STEPS = [
  { id: 'collect', name: '采集 Agent', desc: '获取舆情原始文本' },
  { id: 'clean', name: '清洗 Agent', desc: '去重、过滤广告与无效内容' },
  { id: 'analyze', name: '分析 Agent', desc: '情感分析、关键词与观点提取' },
  { id: 'insight', name: '洞察 Agent', desc: '趋势、风险与核心诉求挖掘' },
  { id: 'debate', name: '交叉验证', desc: '多 Agent 辩论与结论溯源' },
  { id: 'report', name: '报告 Agent', desc: '整合生成舆情分析报告' }
]

/**
 * 运行完整的多智能体分析流水线
 * @param {Object} params
 * @param {string} params.keyword 舆情关键词
 * @param {string} [params.rawText] 用户直接粘贴的舆情文本（提供则跳过联网采集）
 * @param {Array<{id:string, label:string}>} [params.models] 参与协作的模型列表。
 *        - 第一个为「主模型」，负责清洗、洞察、报告；
 *        - 全部模型参与「分析」阶段（并行集成）；
 *        - 验证阶段优先用非主模型做跨模型交叉复核（仅一个模型时自评）。
 * @param {(stepId:string, status:string, detail?:Object)=>void} params.onStep 步骤回调
 *        status: running | done | failed | skipped
 *        detail: 该步骤的中间产物（供 UI 展开查看）
 * @param {(evt:string, payload:any)=>void} [params.onReport] 报告流式回调
 *        evt: 'token' | 'reasoning'
 * @returns {Promise<Object>} 完整分析结果
 */
export async function runAgentFlow({ keyword, rawText, models, onStep, onReport }) {
  const report = onStep || (() => {})

  // ---- 模型角色分配 ----
  const selected = Array.isArray(models) && models.length ? models : [undefined]
  const primary = selected[0] // 主模型：清洗 / 洞察 / 报告
  // 验证模型：优先取非主模型（跨模型交叉验证）；仅一个模型时退化为自评
  const validators = selected.length > 1 ? selected.slice(1) : selected

  // ---- 1. 采集 ----
  report('collect', 'running')
  let raw
  let sources = []
  if (rawText && rawText.trim()) {
    // 「粘贴文本」模式：将用户文本按行/句切分为样本，不依赖任何搜索 API
    raw = rawText
      .split(/\r?\n|(?<=[。！？!?])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
    report('collect', 'done', {
      count: raw.length,
      mode: '粘贴文本',
      samples: raw.slice(0, 8)
    })
  } else {
    const collected = await collectAgent(keyword)
    raw = collected.texts
    sources = collected.sources || []
    report('collect', 'done', {
      count: raw.length,
      mode: '联网搜索（Bocha）',
      sources: sources.slice(0, 8),
      samples: raw.slice(0, 8)
    })
  }

  // ---- 2. 清洗 ----
  report('clean', 'running')
  const cleaned = await cleanAgent(raw, primary)
  report('clean', 'done', {
    before: raw.length,
    after: cleaned.length,
    samples: cleaned.slice(0, 6)
  })

  // ---- 3. 分析（多模型协作：全部选中模型并行独立分析后集成）----
  report('analyze', 'running')
  const analyze = await analyzeAgent(cleaned, selected)
  report('analyze', 'done', {
    sentiment: analyze.sentiment,
    keywords: (analyze.keywords || []).slice(0, 10),
    opinions: analyze.opinions || [],
    contributors: analyze.contributors || []
  })

  // ---- 4. 洞察 ----
  report('insight', 'running')
  const insight = await insightAgent(analyze, keyword, primary)
  report('insight', 'done', {
    trend: insight.trend,
    risks: insight.risks || [],
    demands: insight.demands || [],
    cause: insight.cause
  })

  // ---- 5. 交叉验证 / 辩论（多模型协作：非主模型独立复核）----
  let debate = null
  if (ENABLE_DEBATE) {
    report('debate', 'running')
    debate = await debateService({ keyword, analyze, insight, validators })
    // 若校准后有更新，采用校准情感占比
    if (debate.calibratedSentiment) {
      analyze.sentiment = debate.calibratedSentiment
    }
    report('debate', 'done', {
      agreement: debate.agreement,
      hasDivergence: debate.hasDivergence,
      disputes: debate.disputes || [],
      supplement: debate.supplement || [],
      reviewers: debate.reviewers || [],
      trace: debate.trace
    })
  } else {
    report('debate', 'skipped')
  }

  // ---- 本地趋势推演（不占用步骤，用于报告与看板）----
  const trend = trendPredict({ analyze, insight })

  // ---- 6. 报告（流式生成，实时展示 DeepSeek 撰写/思考过程）----
  report('report', 'running')
  const reportText = await reportAgent({
    keyword,
    cleaned,
    analyze,
    insight,
    trend,
    debate,
    sources,
    model: primary,
    stream: onReport
      ? {
          onToken: (t) => onReport('token', t),
          onReasoning: (t) => onReport('reasoning', t)
        }
      : undefined
  })
  report('report', 'done', { length: reportText.length })

  return { keyword, raw, cleaned, analyze, insight, trend, debate, sources, report: reportText }
}
