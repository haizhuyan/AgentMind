/**
 * pdfExport.js —— 前端生成可下载的 PDF 文件
 * ---------------------------------------------------
 * 复用报告 IR，在页面内构造一份 A4 浅色版面，用 ECharts 绘制图表，
 * 再用 html2pdf.js（html2canvas + jsPDF）截取为分页 PDF 并触发下载。
 *
 * 注意：不可用 left:-9999 / position:fixed 把节点甩出视口，
 * html2canvas 会截成空白页（已知问题）。
 */

import * as echarts from 'echarts'
import html2pdf from 'html2pdf.js'
import { markdownToIR, irToContentHtml, irToTocHtml, escapeHtml } from '../report/ir.js'

function resolveIR(result) {
  const { keyword, report, templateId, ir } = result || {}
  if (ir && Array.isArray(ir.sections) && ir.sections.length) return ir
  return markdownToIR(report || '', { keyword, templateId })
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 生成并下载报告 PDF。
 * @param {Object} result 完整分析结果（runAgentFlow 的返回值）
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(result) {
  const { keyword, analyze, trend, sources = [] } = result || {}
  const ir = resolveIR(result)
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')
  const templateName = ir.meta?.templateName || '舆情分析报告'
  const accent = ir.meta?.accent || '#0EA5E9'

  const sourcesHtml = sources.length
    ? sources
        .map(
          (src, i) =>
            `<li><span class="idx">[${i + 1}]</span> ${escapeHtml(src.title || src.url || '未命名来源')} ${
              src.displayUrl ? `<span class="dim">${escapeHtml(src.displayUrl)}</span>` : ''
            }</li>`
        )
        .join('\n')
    : '<li class="dim">无来源信息</li>'

  const riskBadge = trend?.riskLevel
    ? `<span class="badge" style="background:${trend.riskLevel.color}">风险 ${escapeHtml(
        String(trend.riskLevel.level)
      )}（${trend.riskLevel.score}）</span>`
    : ''

  // 必须在视口内渲染：opacity 极低即可，勿移出屏幕，否则 PDF 空白
  const host = document.createElement('div')
  host.setAttribute('data-pdf-export-host', '1')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:760px',
    'z-index:2147483646',
    'opacity:0.01',
    'pointer-events:none',
    'overflow:visible',
    'background:#ffffff'
  ].join(';')

  const root = document.createElement('div')
  root.className = 'pdf-root'
  root.style.cssText =
    'width:760px;background:#ffffff;color:#0F172A;' +
    'font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;line-height:1.75;padding:8px;'

  root.innerHTML = `
    <style>
      .pdf-root h1.main { font-size:24px; margin:0 0 6px; color:#0F172A; }
      .pdf-root .meta { color:#64748B; font-size:12.5px; }
      .pdf-root header { border-bottom:2px solid ${accent}; padding-bottom:14px; margin-bottom:18px; }
      .pdf-root .badge { display:inline-block; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px; }
      .pdf-root .cards { display:flex; gap:16px; margin:16px 0; }
      .pdf-root .card { flex:1; border:1px solid #E2E8F0; border-radius:10px; padding:12px; background:#F8FAFC; }
      .pdf-root .card h3 { margin:0 0 8px; font-size:14px; color:#475569; }
      .pdf-root .chart { width:100%; height:230px; }
      .pdf-root h2 { font-size:17px; margin:18px 0 8px; color:#0F172A; border-left:4px solid ${accent}; padding-left:10px; }
      .pdf-root ul, .pdf-root ol { padding-left:22px; margin:6px 0; }
      .pdf-root blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid ${accent}; background:#F8FAFC; color:#475569; }
      .pdf-root sup.cite { color:${accent}; font-size:11px; }
      .pdf-root .ir-toc { border:1px solid #E2E8F0; border-radius:10px; padding:12px 16px; margin:14px 0; }
      .pdf-root .ir-toc .toc-title { font-weight:700; margin-bottom:6px; color:#475569; }
      .pdf-root .ir-toc a { color:${accent}; text-decoration:none; }
      .pdf-root .ir-section { page-break-inside:avoid; }
      .pdf-root .sources li { margin-bottom:5px; font-size:13px; list-style:none; }
      .pdf-root .sources { padding-left:0; }
      .pdf-root .sources .idx { color:${accent}; margin-right:4px; }
      .pdf-root .dim { color:#94A3B8; font-size:12px; }
      .pdf-root footer { margin-top:26px; color:#94A3B8; font-size:12px; text-align:center; }
    </style>
    <header>
      <h1 class="main">${escapeHtml(templateName)}：${escapeHtml(keyword || '')} ${riskBadge}</h1>
      <div class="meta">生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成</div>
    </header>
    <div class="cards">
      <div class="card"><h3>情感分布</h3><div class="chart pdf-pie"></div></div>
      <div class="card"><h3>关键词热度 Top</h3><div class="chart pdf-bar"></div></div>
    </div>
    ${irToTocHtml(ir)}
    <div class="report">${irToContentHtml(ir)}</div>
    <h2>信息来源</h2>
    <ul class="sources">${sourcesHtml}</ul>
    <footer>AgentMind · AI 多智能体舆情分析系统</footer>`

  host.appendChild(root)
  document.body.appendChild(host)

  const pieEl = root.querySelector('.pdf-pie')
  const barEl = root.querySelector('.pdf-bar')
  const pie = echarts.init(pieEl, null, { renderer: 'canvas', width: 340, height: 230 })
  const bar = echarts.init(barEl, null, { renderer: 'canvas', width: 360, height: 230 })

  pie.setOption({
    animation: false,
    tooltip: { show: false },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#64748B', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['35%', '50%'],
        itemStyle: { borderColor: '#F8FAFC', borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: s.positive, name: '正面', itemStyle: { color: '#10B981' } },
          { value: s.neutral, name: '中性', itemStyle: { color: '#94A3B8' } },
          { value: s.negative, name: '负面', itemStyle: { color: '#2563EB' } }
        ]
      }
    ]
  })

  const topKw = [...keywords].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10).reverse()
  bar.setOption({
    animation: false,
    tooltip: { show: false },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748B', fontSize: 11 },
      splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: topKw.map((k) => k.word),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94A3B8', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        barWidth: 10,
        data: topKw.map((k) => k.weight || 0),
        itemStyle: {
          borderRadius: [0, 2, 2, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'rgba(14,165,233,0.25)' },
            { offset: 1, color: '#0EA5E9' }
          ])
        }
      }
    ]
  })

  const kw = String(keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
  const filename = `舆情报告_${kw}_${Date.now()}.pdf`

  try {
    // 等布局 + canvas 绘制完成
    await wait(350)

    await html2pdf()
      .set({
        margin: [10, 10, 12, 10],
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 760,
          // 捕获时按元素实际尺寸，避免视口裁切
          onclone: (_doc, el) => {
            el.style.opacity = '1'
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(root)
      .save()
  } finally {
    try {
      pie.dispose()
      bar.dispose()
    } catch {
      /* ignore */
    }
    host.remove()
  }
}
