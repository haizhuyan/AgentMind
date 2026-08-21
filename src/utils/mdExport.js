/**
 * mdExport.js —— 报告 Markdown 导出
 * ---------------------------------------------------
 * 将分析结果装订为可交付的 .md 文件（含指标摘要、情感、关键词、正文、来源）。
 */

import { markdownToIR } from '../report/ir.js'

function resolveIR(result) {
  const { keyword, report, templateId, ir } = result || {}
  if (ir && Array.isArray(ir.sections) && ir.sections.length) return ir
  return markdownToIR(report || '', { keyword, templateId })
}

function safeFileStem(keyword) {
  return String(keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 生成完整 Markdown 报告文本。
 * @param {Object} result runAgentFlow 返回值
 * @returns {string}
 */
export function buildMarkdownReport(result) {
  const { keyword, analyze, trend, sources = [], report, cleaned, raw } = result || {}
  const ir = resolveIR(result)
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')
  const templateName = ir.meta?.templateName || '舆情分析报告'
  const sampleCount = (cleaned || raw || sources || []).length
  const sentimentIndex = Math.round(
    (Number(s.positive) || 0) * 0.7 + (Number(s.neutral) || 0) * 0.3
  )
  const risk = trend?.riskLevel

  const lines = []
  lines.push(`# ${templateName}：${keyword || ''}`)
  lines.push('')
  lines.push(`> 生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成`)
  lines.push('')
  lines.push('## 关键指标')
  lines.push('')
  lines.push(`| 指标 | 数值 |`)
  lines.push(`| --- | --- |`)
  lines.push(`| 声量总量 | ${sampleCount} 条 |`)
  lines.push(`| 情感指数 | ${sentimentIndex} |`)
  lines.push(`| 负面占比 | ${Number(s.negative) || 0}% |`)
  lines.push(
    `| 风险等级 | ${risk ? `${risk.level}（${risk.score}）` : '—'} |`
  )
  lines.push('')
  lines.push('## 情感分布')
  lines.push('')
  lines.push(`- 正面：${Number(s.positive) || 0}%`)
  lines.push(`- 负面：${Number(s.negative) || 0}%`)
  lines.push(`- 中性：${Number(s.neutral) || 0}%`)
  lines.push('')
  lines.push('## 关键词热度 Top10')
  lines.push('')
  const topKw = [...keywords].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10)
  if (topKw.length) {
    topKw.forEach((k, i) => {
      lines.push(`${i + 1}. **${k.word}**（热度 ${k.weight ?? '—'}）`)
    })
  } else {
    lines.push('_暂无关键词_')
  }
  lines.push('')
  lines.push('## 报告正文')
  lines.push('')
  lines.push(String(report || '').trim() || '_暂无正文_')
  lines.push('')
  lines.push('## 信息来源')
  lines.push('')
  if (sources.length) {
    sources.forEach((src, i) => {
      const title = src.title || src.url || '未命名来源'
      const url = src.url || ''
      lines.push(`${i + 1}. ${url ? `[${title}](${url})` : title}${src.displayUrl ? ` — ${src.displayUrl}` : ''}`)
    })
  } else {
    lines.push('_无来源信息_')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*AgentMind · AI 多智能体舆情分析系统*')
  lines.push('')
  return lines.join('\n')
}

/**
 * 下载 Markdown 报告。
 * @param {Object} result
 */
export function downloadMarkdownReport(result) {
  const md = buildMarkdownReport(result)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `舆情报告_${safeFileStem(result?.keyword)}_${Date.now()}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
