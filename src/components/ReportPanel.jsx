import { useState } from 'react'
import { buildHtmlReport } from '../utils/htmlReport.js'

/**
 * ReportPanel —— 舆情报告展示区
 * 渲染 Markdown 报告（轻量解析），支持复制与导出交互式 HTML。
 * @param {string} props.report   报告 Agent 生成的 Markdown 文本
 * @param {Object} props.debate   辩论/交叉验证结果（展示溯源）
 * @param {Array}  props.sources  采集来源列表
 * @param {Object} props.result   完整分析结果（用于导出 HTML）
 */
export default function ReportPanel({ report, debate, sources = [], result }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function exportHtml() {
    const html = buildHtmlReport(result)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const kw = (result?.keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
    a.href = url
    a.download = `舆情报告_${kw}_${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="card report-panel">
      <h2 className="card-title">
        <span className="title-bar" />
        舆情分析报告
        <span className="report-actions">
          <button className="copy-btn" onClick={exportHtml}>
            导出 HTML
          </button>
          <button className="copy-btn" onClick={copy}>
            {copied ? '已复制 ✓' : '复制报告'}
          </button>
        </span>
      </h2>

      {debate && (
        <div className={`trace-box ${debate.hasDivergence ? 'warn' : 'ok'}`}>
          <b>结论溯源：</b>
          {debate.trace}
        </div>
      )}

      <div className="report-body">{renderMarkdown(report)}</div>

      {sources.length > 0 && (
        <div className="source-box">
          <div className="source-title">信息来源（{sources.length}）</div>
          <ol className="source-list">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url || '#'} target="_blank" rel="noreferrer">
                  {s.title || s.url || '未命名来源'}
                </a>
                {s.displayUrl && <span className="source-url">{s.displayUrl}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

/**
 * 极简 Markdown 渲染：支持标题、加粗、列表。
 * 用于演示报告展示，避免引入额外依赖。
 */
function renderMarkdown(md = '') {
  const lines = md.split('\n')
  const blocks = []
  let list = []

  const flushList = (key) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key}`} className="md-ul">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      )
      list = []
    }
  }

  lines.forEach((line, idx) => {
    const t = line.trim()
    if (!t) {
      flushList(idx)
      return
    }
    if (t.startsWith('## ')) {
      flushList(idx)
      blocks.push(
        <h3 key={idx} className="md-h">
          {t.replace(/^##\s*/, '')}
        </h3>
      )
    } else if (t.startsWith('# ')) {
      flushList(idx)
      blocks.push(
        <h2 key={idx} className="md-h1">
          {t.replace(/^#\s*/, '')}
        </h2>
      )
    } else if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) {
      list.push(t.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, ''))
    } else {
      flushList(idx)
      blocks.push(
        <p key={idx} className="md-p">
          {inline(t)}
        </p>
      )
    }
  })
  flushList('end')
  return blocks
}

// 行内加粗高亮 + 引用编号 [n] 上标
function inline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={i} className="md-strong">
          {p.slice(2, -2)}
        </strong>
      )
    }
    if (/^\[\d+\]$/.test(p)) {
      return (
        <sup key={i} className="md-cite">
          {p}
        </sup>
      )
    }
    return <span key={i}>{p}</span>
  })
}
