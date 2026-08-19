/**
 * flowExport.js —— 多智能体协作流程产物导出
 * ---------------------------------------------------
 * 将「采集 → 清洗 → 分析 → 洞察 → 论坛 → 报告」各步骤的中间产物
 * （statuses 中的 detail）序列化为可读文档，支持导出 Markdown 与自包含
 * HTML，便于留档、分享与离线查看。不依赖任何网络。
 */

import { AGENT_STEPS } from '../services/agentOrchestrator.js'
import { escapeHtml } from '../report/ir.js'

const STATUS_LABEL = {
  running: '运行中',
  done: '已完成',
  failed: '失败',
  skipped: '已跳过',
  idle: '待运行'
}

/** 情感占比一行文本 */
function sentimentLine(s = {}) {
  return `正面 ${s.positive ?? 0}% ・ 负面 ${s.negative ?? 0}% ・ 中性 ${s.neutral ?? 0}%`
}

/** 将单个步骤的产物渲染为 Markdown 片段 */
function stepToMarkdown(step, entry) {
  const status = entry?.status || 'idle'
  const d = entry?.detail
  const lines = [`## ${step.name}　—　${STATUS_LABEL[status] || status}`, '', `> ${step.desc}`, '']

  if (!d || status === 'idle') {
    lines.push('_（无产物）_', '')
    return lines.join('\n')
  }

  switch (step.id) {
    case 'collect':
      lines.push(`- 数据来源：${d.mode || '—'}`, `- 样本数量：${d.count ?? 0} 条`)
      if (d.sources?.length) {
        lines.push('', '**信息来源**')
        d.sources.forEach((s, i) => {
          lines.push(`${i + 1}. ${s.title || s.url || '未命名来源'}${s.displayUrl ? `（${s.displayUrl}）` : ''}`)
        })
      }
      if (d.samples?.length) {
        lines.push('', '**样本示例**')
        d.samples.forEach((t) => lines.push(`- ${t}`))
      }
      break

    case 'clean':
      lines.push(`- 清洗前：${d.before ?? 0} 条`, `- 清洗后：${d.after ?? 0} 条（去重 / 去广告 / 去无效）`)
      if (d.samples?.length) {
        lines.push('', '**清洗后样本**')
        d.samples.forEach((t) => lines.push(`- ${t}`))
      }
      break

    case 'analyze': {
      const contribs = d.contributors || []
      if (contribs.length) {
        lines.push('**参与分析**')
        contribs.forEach((c) => {
          if (c.kind === 'local') {
            lines.push(`- 🧭 ${c.label}（本地情感词典，覆盖 ${c.coverage ?? 0}%）`)
          } else {
            lines.push(`- ${c.ok ? '✓' : '✕'} ${c.label}`)
          }
        })
        lines.push('')
      }
      lines.push(`- 情感占比：${sentimentLine(d.sentiment)}`)
      if (d.keywords?.length) {
        lines.push('', '**关键词热度**')
        d.keywords.forEach((k) => lines.push(`- ${k.word}（${k.weight}）`))
      }
      if (d.opinions?.length) {
        lines.push('', '**核心观点**')
        d.opinions.forEach((o) => lines.push(`- ${o}`))
      }
      break
    }

    case 'insight':
      if (d.trend) lines.push(`- 趋势：${d.trend}`)
      if (d.risks?.length) {
        lines.push('', '**潜在风险**')
        d.risks.forEach((r) => lines.push(`- ${r}`))
      }
      if (d.demands?.length) {
        lines.push('', '**核心诉求**')
        d.demands.forEach((r) => lines.push(`- ${r}`))
      }
      if (d.cause) lines.push('', `- 成因：${d.cause}`)
      break

    case 'debate':
      lines.push(
        `- 平均一致度：${d.agreement ?? '—'}%${d.hasDivergence ? '（存在分歧，已二次校准）' : '（结论高度一致）'}`
      )
      if (d.reviewers?.length) {
        lines.push('', '**参与复核**')
        d.reviewers.forEach((r) => {
          lines.push(`- ${r.ok ? '✓' : '✕'} ${r.label}${r.ok && r.agreement != null ? `（${r.agreement}%）` : ''}`)
        })
      }
      if (d.rounds?.length) {
        lines.push('', '**论坛多轮进程**')
        d.rounds.forEach((r) => {
          lines.push('', `### 第 ${r.round} 轮${typeof r.agreement === 'number' ? `（一致度 ${r.agreement}%）` : ''}`)
          ;(r.speeches || []).forEach((s) => lines.push(`- **${s.label}**：${s.content}`))
          if (r.host) {
            if (r.host.summary) lines.push('', `🎙 **主持人归纳**：${r.host.summary}`)
            if (r.host.consensus?.length) lines.push('', '共识：', ...r.host.consensus.map((c) => `- ${c}`))
            if (r.host.divergences?.length) lines.push('', '分歧：', ...r.host.divergences.map((c) => `- ${c}`))
            if (r.host.questions?.length) lines.push('', '下一轮追问：', ...r.host.questions.map((c) => `- ${c}`))
          }
        })
      } else {
        if (d.disputes?.length) {
          lines.push('', '**分歧点**')
          d.disputes.forEach((r) => lines.push(`- ${r}`))
        }
        if (d.supplement?.length) {
          lines.push('', '**补充**')
          d.supplement.forEach((r) => lines.push(`- ${r}`))
        }
      }
      if (d.trace) lines.push('', `> 结论溯源：${d.trace}`)
      break

    case 'report':
      lines.push(`- 报告已生成，共 ${d.length ?? 0} 字（正文见「舆情分析报告」区）`)
      break

    default:
      lines.push('```json', JSON.stringify(d, null, 2), '```')
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * 生成多智能体协作流程产物的 Markdown 文档。
 * @param {Object} statuses  { stepId: { status, detail } }
 * @param {Object} [meta]    { keyword }
 * @returns {string}
 */
export function buildFlowMarkdown(statuses = {}, meta = {}) {
  const generatedAt = new Date().toLocaleString('zh-CN')
  const head = [
    `# 多智能体协作流程产物`,
    '',
    meta.keyword ? `**分析对象**：${meta.keyword}` : '',
    `**生成时间**：${generatedAt}`,
    '',
    '---',
    ''
  ].filter(Boolean)

  const body = AGENT_STEPS
    .filter((step) => statuses[step.id])
    .map((step) => stepToMarkdown(step, statuses[step.id]))

  return [...head, ...body].join('\n').trim() + '\n'
}

/** 极简 Markdown → HTML（标题 / 列表 / 引用 / 加粗），用于自包含导出 */
function miniMarkdownToHtml(md = '') {
  const lines = md.split('\n')
  const out = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  const inline = (t) =>
    escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      closeList()
      continue
    }
    if (line === '---') {
      closeList()
      out.push('<hr/>')
    } else if (line.startsWith('### ')) {
      closeList()
      out.push(`<h3>${inline(line.slice(4))}</h3>`)
    } else if (line.startsWith('## ')) {
      closeList()
      out.push(`<h2>${inline(line.slice(3))}</h2>`)
    } else if (line.startsWith('# ')) {
      closeList()
      out.push(`<h1>${inline(line.slice(2))}</h1>`)
    } else if (line.startsWith('> ')) {
      closeList()
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
    } else if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(line.replace(/^([-*]|\d+\.)\s+/, ''))}</li>`)
    } else {
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

/**
 * 生成自包含的 HTML（深色科技风），用于离线查看流程产物。
 * @param {Object} statuses
 * @param {Object} [meta]
 * @returns {string}
 */
export function buildFlowHtml(statuses = {}, meta = {}) {
  const md = buildFlowMarkdown(statuses, meta)
  const content = miniMarkdownToHtml(md)
  const title = `多智能体协作流程产物${meta.keyword ? ` · ${escapeHtml(meta.keyword)}` : ''}`
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  :root{color-scheme:dark;}
  body{margin:0;padding:32px 16px;background:#161617;color:#f5f5f7;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;line-height:1.7;}
  .wrap{max-width:860px;margin:0 auto;background:#1d1d1f;border:1px solid #26262a;
    border-radius:14px;padding:28px 32px;box-shadow:0 8px 30px rgba(0,0,0,.35);}
  h1{font-size:26px;margin:0 0 8px;color:#a1a1a6;}
  h2{font-size:19px;margin:26px 0 10px;padding-left:10px;border-left:3px solid #007aff;color:#f5f5f7;}
  h3{font-size:15px;margin:16px 0 6px;color:#007aff;}
  hr{border:none;border-top:1px solid #26262a;margin:18px 0;}
  ul{margin:6px 0 10px;padding-left:22px;}
  li{margin:3px 0;}
  p{margin:6px 0;}
  blockquote{margin:8px 0;padding:8px 14px;background:rgba(56,189,248,.08);
    border-left:3px solid #007aff;border-radius:6px;color:#a1a1a6;}
  strong{color:#fff;}
  .foot{max-width:860px;margin:14px auto 0;text-align:center;color:#6e6e73;font-size:12px;}
</style>
</head>
<body>
  <div class="wrap">${content}</div>
  <div class="foot">AgentMind · 多智能体舆情分析系统</div>
</body>
</html>`
}

/** 触发浏览器下载 */
export function downloadTextFile(text, filename, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** 安全文件名 */
export function safeName(s = 'flow') {
  return String(s).replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'flow'
}
