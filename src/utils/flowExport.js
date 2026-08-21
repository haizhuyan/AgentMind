/**
 * flowExport.js —— 多智能体协作流程产物导出
 * ---------------------------------------------------
 * HTML 导出样式对齐工作台「智能体流水线」卡片：时间线 + 步骤状态 +
 * 中间产物详情（默认全部展开），便于离线查看与留档。
 */

import { AGENT_STEPS } from '../services/agentOrchestrator.js'
import { escapeHtml } from '../report/ir.js'

const STATUS_LABEL = {
  running: '运行中',
  done: '已完成',
  failed: '失败',
  skipped: '已跳过',
  idle: '待运行',
  pending: '待运行'
}

const TAG_CLASS = {
  running: 'tag-running',
  done: 'tag-done',
  failed: 'tag-failed',
  skipped: 'tag-done',
  idle: 'tag-pending',
  pending: 'tag-pending'
}

/** 情感占比一行文本 */
function sentimentLine(s = {}) {
  return `正面 ${s.positive ?? 0}% ・ 负面 ${s.negative ?? 0}% ・ 中性 ${s.neutral ?? 0}%`
}

function truncate(s = '', n = 120) {
  const t = String(s)
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/** 将单个步骤的产物渲染为 Markdown 片段 */
function stepToMarkdown(step, entry) {
  const status = entry?.status || 'idle'
  const d = entry?.detail
  const lines = [`## ${step.name}　—　${STATUS_LABEL[status] || status}`, '', `> ${step.desc}`, '']

  if (!d || status === 'idle' || status === 'pending') {
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
          const label = typeof r === 'string' ? r : r.label
          const ok = typeof r === 'string' ? true : r.ok
          const ag = typeof r === 'object' && r.agreement != null ? `（${r.agreement}%）` : ''
          lines.push(`- ${ok ? '✓' : '✕'} ${label}${ok ? ag : ''}`)
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

  const body = AGENT_STEPS.filter((step) => statuses[step.id]).map((step) =>
    stepToMarkdown(step, statuses[step.id])
  )

  return [...head, ...body].join('\n').trim() + '\n'
}

function outputText(stepId, status, d) {
  if (status === 'pending' || status === 'idle') return '等待执行'
  if (status === 'running') return stepId === 'analyze' ? '多模型并行情感分析中…' : '执行中…'
  if (status === 'failed') return '执行失败'
  if (!d) return '已完成'
  switch (stepId) {
    case 'collect':
      return `采集 ${d.count ?? 0} 条有效样本${d.mode ? ` · ${d.mode}` : ''} · 来源链接已溯源`
    case 'clean':
      return `清洗后 ${d.after ?? 0} 条 · 去重/去广告/去无效 ${Math.max(0, (d.before || 0) - (d.after || 0))} 条`
    case 'analyze': {
      const models = (d.contributors || []).filter((c) => c.kind !== 'local').map((c) => c.label)
      return `${models.length ? models.join(' / ') + ' ' : ''}情感占比 正${d.sentiment?.positive || 0}/负${d.sentiment?.negative || 0}/中${d.sentiment?.neutral || 0}`
    }
    case 'insight':
      return `风险等级：${d.trend || '—'} · ${(d.risks || []).length}项潜在风险 · ${(d.demands || []).length}条核心诉求`
    case 'debate':
      return `${(d.rounds || []).length ? (d.rounds || []).length + '轮辩论' : '交叉验证'} · 一致度 ${d.agreement ?? '—'}% · 共识/分歧已标注`
    case 'report':
      return `报告已生成 · ${d.length ?? 0}字 · 支持 HTML / PDF / Markdown 导出`
    default:
      return '已完成'
  }
}

function statusIcon(status) {
  if (status === 'done') {
    return `<svg class="check" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>`
  }
  if (status === 'failed') return `<span class="fail">✕</span>`
  if (status === 'running') return `<span class="spinner"></span>`
  return `<span class="pending-dot">○</span>`
}

const STEP_ICONS = {
  collect: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
  clean: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 5L20 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 12L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 19L14 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
  analyze: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 20V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 20V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
  insight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M12 4L12 12L18.9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>`,
  debate: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="17" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 19C4 16.79 5.79 15 8 15L16 15C18.21 15 20 16.79 20 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
  report: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 8L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 12L15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 16L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>`
}

function sentiBar(label, val, color) {
  const v = Number(val) || 0
  return `<div class="senti-bar-row">
    <span class="senti-label">${escapeHtml(label)}</span>
    <div class="senti-track"><div class="senti-fill" style="width:${v}%;background:${color}"></div></div>
    <span class="senti-val">${v}%</span>
  </div>`
}

function listHtml(items = []) {
  if (!items.length) return ''
  return `<ul class="detail-list">${items.map((it) => `<li>${escapeHtml(String(it))}</li>`).join('')}</ul>`
}

function badges(items, failKey = 'ok') {
  return items
    .map((c) => {
      const ok = c[failKey] !== false
      return `<span class="model-badge ${ok ? '' : 'model-badge-fail'}">${ok ? '✓' : '✕'} ${escapeHtml(c.label || '')}</span>`
    })
    .join('')
}

/** 对齐 agentDetail.jsx 的中间产物 HTML（导出时全部展开） */
function detailHtml(stepId, d) {
  if (!d) return `<div class="detail-tag dim">（无产物）</div>`

  if (stepId === 'debate' && (d._forum || d.rounds?.length)) {
    return forumHtml(d)
  }

  switch (stepId) {
    case 'collect': {
      const sources = (d.sources || [])
        .map(
          (s) =>
            `<li><a href="${escapeHtml(s.url || '#')}">${escapeHtml(s.title || s.url || '未命名来源')}</a>${
              s.displayUrl ? `<span class="dim"> · ${escapeHtml(s.displayUrl)}</span>` : ''
            }</li>`
        )
        .join('')
      return `<div class="detail-tag">数据来源：${escapeHtml(d.mode || '—')}　·　样本 ${d.count ?? 0} 条</div>
        ${sources ? `<ul class="detail-sources">${sources}</ul>` : ''}`
    }
    case 'clean': {
      const samples = (d.samples || [])
        .map((t) => `<div class="sample-line">${escapeHtml(truncate(t, 120))}</div>`)
        .join('')
      return `<div class="detail-tag">清洗前 ${d.before ?? 0} 条 → 清洗后 <b>${d.after ?? 0}</b> 条（去重 / 去广告 / 去无效）</div>
        ${samples ? `<div class="detail-samples">${samples}</div>` : ''}`
    }
    case 'analyze': {
      const localContrib = (d.contributors || []).find((c) => c.kind === 'local')
      const modelContribs = (d.contributors || []).filter((c) => c.kind !== 'local')
      const chips = (d.keywords || [])
        .map((k) => `<span class="chip">${escapeHtml(k.word)}<i>${escapeHtml(String(k.weight ?? ''))}</i></span>`)
        .join('')
      return `${
        modelContribs.length
          ? `<div class="detail-tag">多模型协作分析：${badges(modelContribs)}</div>`
          : ''
      }
      ${
        localContrib
          ? `<div class="detail-tag">本地情感中间件：<span class="model-badge model-badge-local">🧭 ${escapeHtml(
              localContrib.label || ''
            )}</span>
            <span class="dim">词典命中覆盖 ${localContrib.coverage ?? 0}%（本地占比 正${localContrib.sentiment?.positive ?? 0}/负${localContrib.sentiment?.negative ?? 0}/中${localContrib.sentiment?.neutral ?? 0}），已按权重与 LLM 融合校准</span></div>`
          : ''
      }
      <div class="sentiment-bars">
        ${sentiBar('正面', d.sentiment?.positive, '#34c759')}
        ${sentiBar('负面', d.sentiment?.negative, '#ff3b30')}
        ${sentiBar('中性', d.sentiment?.neutral, '#007aff')}
      </div>
      ${chips ? `<div class="detail-chips">${chips}</div>` : ''}
      ${listHtml(d.opinions || [])}`
    }
    case 'insight':
      return `${d.trend ? `<div class="detail-tag">趋势：${escapeHtml(String(d.trend))}</div>` : ''}
        ${
          d.risks?.length
            ? `<div class="detail-block"><span class="block-label risk">风险</span>${listHtml(d.risks)}</div>`
            : ''
        }
        ${
          d.demands?.length
            ? `<div class="detail-block"><span class="block-label demand">诉求</span>${listHtml(d.demands)}</div>`
            : ''
        }
        ${d.cause ? `<div class="detail-cause">成因：${escapeHtml(String(d.cause))}</div>` : ''}`
    case 'debate':
      return `<div class="detail-tag">多模型交叉验证，平均一致度 <b>${escapeHtml(String(d.agreement ?? '—'))}%</b>${
        d.hasDivergence ? '（存在分歧，已二次校准）' : '（结论高度一致）'
      }</div>
      ${
        d.reviewers?.length
          ? `<div class="detail-tag">参与复核：${badges(
              d.reviewers.map((r) =>
                typeof r === 'string'
                  ? { label: r, ok: true }
                  : { label: `${r.label}${r.ok && r.agreement != null ? `（${r.agreement}%）` : ''}`, ok: r.ok }
              )
            )}</div>`
          : ''
      }
      ${
        d.disputes?.length
          ? `<div class="detail-block"><span class="block-label risk">分歧点</span>${listHtml(d.disputes)}</div>`
          : ''
      }
      ${
        d.supplement?.length
          ? `<div class="detail-block"><span class="block-label demand">补充</span>${listHtml(d.supplement)}</div>`
          : ''
      }
      ${d.trace ? `<div class="forum-trace"><b>结论溯源：</b>${escapeHtml(String(d.trace))}</div>` : ''}`
    case 'report':
      return `<div class="detail-tag">报告已生成（${d.length ?? 0} 字）</div>`
    default:
      return `<pre class="detail-pre">${escapeHtml(JSON.stringify(d, null, 2))}</pre>`
  }
}

function forumHtml(d) {
  const rounds = Array.isArray(d.rounds) ? d.rounds : []
  const reviewers = (d.reviewers || [])
    .map((r) => `<span class="model-badge">${escapeHtml(typeof r === 'string' ? r : r.label || '')}</span>`)
    .join('')
  const roundsHtml = rounds
    .map((r) => {
      const speeches = (r.speeches || [])
        .map(
          (s) =>
            `<div class="forum-speech ${s.ok === false ? 'fail' : ''}"><span class="forum-speaker">${escapeHtml(
              s.label || ''
            )}</span><span class="forum-content">${escapeHtml(s.content || '')}</span></div>`
        )
        .join('')
      let host = ''
      if (r.host) {
        host = `<div class="forum-host">
          <div class="forum-host-tag">🎙 主持人归纳</div>
          ${r.host.summary ? `<p class="forum-host-summary">${escapeHtml(r.host.summary)}</p>` : ''}
          ${
            r.host.consensus?.length
              ? `<div class="forum-host-block"><span class="block-label demand">共识</span>${listHtml(r.host.consensus)}</div>`
              : ''
          }
          ${
            r.host.divergences?.length
              ? `<div class="forum-host-block"><span class="block-label risk">分歧</span>${listHtml(r.host.divergences)}</div>`
              : ''
          }
          ${
            r.host.questions?.length
              ? `<div class="forum-host-block"><span class="block-label">下一轮追问</span>${listHtml(r.host.questions)}</div>`
              : ''
          }
        </div>`
      }
      return `<div class="forum-round">
        <div class="forum-round-head">第 ${r.round} 轮${
          typeof r.agreement === 'number' ? `<span class="forum-agreement">一致度 ${r.agreement}%</span>` : ''
        }</div>
        ${speeches}${host}
      </div>`
    })
    .join('')

  return `<div class="forum-view">
    <div class="detail-tag">论坛协作：主持人 ${
      d.host ? `<span class="model-badge">${escapeHtml(String(d.host))}</span>` : ''
    } 引导 ${reviewers} 多轮复核</div>
    ${roundsHtml}
    ${d.trace ? `<div class="forum-trace"><b>结论溯源：</b>${escapeHtml(String(d.trace))}</div>` : ''}
  </div>`
}

function stepHtml(step, entry) {
  const status = entry?.status || 'pending'
  const d = entry?.detail
  const hasDetail = Boolean(d) && status !== 'idle' && status !== 'pending'
  const tag = TAG_CLASS[status] || 'tag-pending'
  const label = STATUS_LABEL[status] || status

  return `<div class="agent-step ${escapeHtml(status)}">
    <div class="agent-step-icon">${STEP_ICONS[step.id] || ''}</div>
    <div class="agent-step-body">
      <div class="agent-step-head">
        <span class="agent-step-name">${escapeHtml(step.name)}</span>
        <span class="agent-step-tag ${tag}">${escapeHtml(label)}</span>
      </div>
      <div class="agent-step-desc">${escapeHtml(step.desc)}</div>
      <div class="agent-step-output">
        ${statusIcon(status)}
        <span>${escapeHtml(outputText(step.id, status, d))}</span>
      </div>
      ${hasDetail ? `<div class="agent-step-detail">${detailHtml(step.id, d)}</div>` : ''}
    </div>
  </div>`
}

/**
 * 生成自包含 HTML：样式对齐工作台流水线卡片，各步骤中间产物全部展开。
 * @param {Object} statuses
 * @param {Object} [meta]
 * @returns {string}
 */
export function buildFlowHtml(statuses = {}, meta = {}) {
  const generatedAt = new Date().toLocaleString('zh-CN')
  const steps = AGENT_STEPS.filter((step) => statuses[step.id])
  const doneCount = steps.filter((s) => statuses[s.id]?.status === 'done').length
  const title = `智能体流水线${meta.keyword ? ` · ${escapeHtml(meta.keyword)}` : ''}`
  const stepsMarkup = steps.map((step) => stepHtml(step, statuses[step.id])).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  :root {
    --ink-50:#0F172A; --ink-100:#1E293B; --ink-200:#334155; --ink-300:#475569;
    --ink-400:#64748B; --ink-500:#94A3B8; --ink-950:#FFFFFF;
    --surface:#FFFFFF; --surface-2:#F8FAFC;
    --border:#E2E8F0; --cyan:#0EA5E9; --signal:#2563EB;
    --chartreuse:#10B981; --risk:#EF4444;
    --signal-glow:rgba(37,99,235,.25);
    --radius-sm:6px; --radius-md:10px; --radius-lg:14px;
    --font-body:"Inter","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
    --font-display:"Noto Sans SC","Inter",system-ui,sans-serif;
    --font-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin:0; padding:28px 16px 48px; background:#EEF2F7; color:var(--ink-200);
    font-family:var(--font-body); line-height:1.6;
  }
  .page { max-width:820px; margin:0 auto; }
  .meta-line {
    font-size:12px; color:var(--ink-400); margin-bottom:12px;
    font-family:var(--font-mono);
  }
  .pipeline-card {
    background:var(--ink-950); border:1px solid var(--border);
    border-radius:var(--radius-lg); overflow:hidden;
    box-shadow:0 12px 40px rgba(15,23,42,.06);
  }
  .pipeline-card-header {
    padding:14px 18px; border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
    background:var(--surface);
  }
  .pipeline-card-title {
    display:flex; align-items:center; gap:10px;
    font-family:var(--font-display); font-size:14px; font-weight:600; color:var(--ink-100);
  }
  .pipeline-status { font-family:var(--font-mono); font-size:11px; color:var(--ink-400); }
  .agent-steps { padding:16px 18px; }
  .agent-step { display:flex; gap:14px; padding:10px 0; position:relative; }
  .agent-step:not(:last-child)::after {
    content:""; position:absolute; left:19px; top:42px; bottom:-2px; width:2px; background:var(--border);
  }
  .agent-step.done:not(:last-child)::after {
    background:linear-gradient(180deg, var(--cyan), var(--border));
  }
  .agent-step-icon {
    width:40px; height:40px; border-radius:var(--radius-md);
    display:grid; place-items:center; flex-shrink:0; position:relative; z-index:1;
  }
  .agent-step.pending .agent-step-icon,
  .agent-step.idle .agent-step-icon {
    background:var(--surface-2); border:1px solid var(--border); color:var(--ink-500);
  }
  .agent-step.running .agent-step-icon {
    background:rgba(37,99,235,.1); border:1px solid rgba(37,99,235,.3); color:var(--signal);
  }
  .agent-step.done .agent-step-icon {
    background:rgba(14,165,233,.1); border:1px solid rgba(14,165,233,.25); color:var(--cyan);
  }
  .agent-step.failed .agent-step-icon {
    background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:var(--risk);
  }
  .agent-step-body { flex:1; min-width:0; padding-top:2px; }
  .agent-step-head { display:flex; align-items:center; gap:8px; margin-bottom:3px; }
  .agent-step-name { font-size:13.5px; font-weight:600; color:var(--ink-100); }
  .agent-step.pending .agent-step-name,
  .agent-step.idle .agent-step-name { color:var(--ink-400); }
  .agent-step-tag {
    font-family:var(--font-mono); font-size:9.5px; padding:2px 6px;
    border-radius:3px; font-weight:600; letter-spacing:.05em;
  }
  .tag-running { background:rgba(37,99,235,.1); color:var(--signal); }
  .tag-done { background:rgba(14,165,233,.1); color:var(--cyan); }
  .tag-pending { background:var(--surface-2); color:var(--ink-500); }
  .tag-failed { background:rgba(239,68,68,.1); color:var(--risk); }
  .agent-step-desc { font-size:12.5px; color:var(--ink-400); line-height:1.5; }
  .agent-step-output {
    margin-top:8px; padding:8px 12px; background:var(--surface);
    border:1px solid var(--border); border-radius:var(--radius-sm);
    font-size:12px; color:var(--ink-300); display:flex; align-items:center; gap:8px;
  }
  .agent-step-output .check { color:var(--chartreuse); flex-shrink:0; }
  .agent-step-output .fail { color:var(--risk); flex-shrink:0; }
  .agent-step-output .pending-dot { color:var(--ink-500); }
  .spinner {
    width:14px; height:14px; border:2px solid rgba(37,99,235,.2);
    border-top-color:var(--signal); border-radius:50%;
    animation:spin .8s linear infinite; flex-shrink:0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .agent-step-detail {
    margin-top:10px; padding:12px 14px; background:var(--surface);
    border:1px solid var(--border); border-radius:var(--radius-sm);
    font-size:12.5px; color:var(--ink-300);
  }
  .detail-tag { margin-bottom:8px; line-height:1.6; }
  .detail-tag .dim, .dim { color:var(--ink-500); }
  .detail-sources, .detail-list { margin:6px 0 0; padding-left:18px; }
  .detail-sources li, .detail-list li { margin:4px 0; }
  .detail-samples { margin-top:8px; display:flex; flex-direction:column; gap:6px; }
  .sample-line {
    padding:8px 10px; background:var(--surface-2); border:1px solid var(--border);
    border-radius:6px; font-size:12px; color:var(--ink-300);
  }
  .model-badge {
    display:inline-block; margin:0 4px 4px 0; padding:2px 8px; border-radius:999px;
    font-size:11px; background:rgba(14,165,233,.1); color:var(--cyan);
    border:1px solid rgba(14,165,233,.25);
  }
  .model-badge-fail { background:rgba(239,68,68,.08); color:var(--risk); border-color:rgba(239,68,68,.25); }
  .model-badge-local { background:rgba(16,185,129,.1); color:var(--chartreuse); border-color:rgba(16,185,129,.25); }
  .sentiment-bars { display:flex; flex-direction:column; gap:8px; margin:10px 0; }
  .senti-bar-row { display:flex; align-items:center; gap:8px; }
  .senti-label { width:34px; font-size:11.5px; color:var(--ink-400); flex-shrink:0; }
  .senti-track { flex:1; height:8px; background:var(--surface-2); border-radius:4px; overflow:hidden; }
  .senti-fill { height:100%; border-radius:4px; }
  .senti-val {
    width:34px; text-align:right; font-size:11.5px; font-family:var(--font-mono);
    color:var(--ink-300); font-weight:600;
  }
  .detail-chips { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
  .chip {
    display:inline-flex; align-items:center; gap:6px; padding:4px 10px;
    background:var(--surface-2); border:1px solid var(--border); border-radius:999px;
    font-size:12px; color:var(--ink-200);
  }
  .chip i { font-style:normal; font-family:var(--font-mono); font-size:10px; color:var(--ink-500); }
  .detail-block { margin-top:10px; }
  .block-label {
    display:inline-block; font-size:11px; font-weight:600; padding:2px 8px;
    border-radius:4px; margin-bottom:6px; background:var(--surface-2); color:var(--ink-400);
  }
  .block-label.risk { background:rgba(239,68,68,.1); color:var(--risk); }
  .block-label.demand { background:rgba(16,185,129,.1); color:var(--chartreuse); }
  .detail-cause { margin-top:8px; padding:8px 10px; background:var(--surface-2); border-radius:6px; }
  .forum-round {
    margin-top:12px; padding:12px; border:1px solid var(--border);
    border-radius:8px; background:var(--surface-2);
  }
  .forum-round-head {
    font-weight:600; font-size:12.5px; color:var(--ink-100); margin-bottom:8px;
    display:flex; align-items:center; gap:8px;
  }
  .forum-agreement {
    font-family:var(--font-mono); font-size:11px; color:var(--cyan);
    font-weight:500;
  }
  .forum-speech { display:flex; gap:10px; margin:6px 0; font-size:12.5px; }
  .forum-speech.fail .forum-speaker { color:var(--risk); }
  .forum-speaker {
    flex-shrink:0; font-weight:600; color:var(--cyan); min-width:72px;
  }
  .forum-content { color:var(--ink-300); }
  .forum-host {
    margin-top:10px; padding:10px 12px; border-left:3px solid var(--signal);
    background:rgba(37,99,235,.04); border-radius:0 8px 8px 0;
  }
  .forum-host-tag { font-size:12px; font-weight:600; color:var(--signal); margin-bottom:6px; }
  .forum-host-summary { margin:0 0 8px; font-size:12.5px; color:var(--ink-200); }
  .forum-host-block { margin-top:8px; }
  .forum-trace {
    margin-top:12px; padding:10px 12px; background:rgba(14,165,233,.06);
    border:1px solid rgba(14,165,233,.2); border-radius:8px; font-size:12.5px;
  }
  a { color:var(--cyan); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .foot { margin-top:14px; text-align:center; color:var(--ink-500); font-size:12px; }
</style>
</head>
<body>
  <div class="page">
    <div class="meta-line">分析对象：${escapeHtml(meta.keyword || '—')}　·　导出时间：${escapeHtml(generatedAt)}　·　中间产物已全部展开</div>
    <div class="pipeline-card">
      <div class="pipeline-card-header">
        <div class="pipeline-card-title">智能体流水线</div>
        <div class="pipeline-status">${doneCount}/${steps.length} 完成</div>
      </div>
      <div class="agent-steps">
        ${stepsMarkup}
      </div>
    </div>
    <div class="foot">AgentMind · 多智能体舆情分析系统</div>
  </div>
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

/** 下载流水线 Markdown */
export function downloadFlowMarkdown(statuses = {}, meta = {}) {
  const md = buildFlowMarkdown(statuses, meta)
  downloadTextFile(md, `多智能体协作流程产物_${safeName(meta.keyword || 'flow')}.md`, 'text/markdown')
}

/** 下载流水线 HTML */
export function downloadFlowHtml(statuses = {}, meta = {}) {
  const html = buildFlowHtml(statuses, meta)
  downloadTextFile(html, `多智能体协作流程产物_${safeName(meta.keyword || 'flow')}.html`, 'text/html')
}
