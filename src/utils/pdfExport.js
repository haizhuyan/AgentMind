/**
 * pdfExport.js —— 前端生成可下载的 PDF 文件
 * ---------------------------------------------------
 * 复用报告 IR，在页面外构造一份 A4 浅色版面，用 ECharts 绘制图表，
 * 再用 html2pdf.js（html2canvas + jsPDF）截取为分页 PDF 并触发下载。
 * 与"调用打印机"不同，这里直接产出电子版 PDF 文件保存到本地。
 */

import * as echarts from 'echarts'
import html2pdf from 'html2pdf.js'
import { markdownToIR, irToContentHtml, irToTocHtml, escapeHtml } from '../report/ir.js'

/** 从 result 取得 IR：优先用已生成的 result.ir，否则由 Markdown 兜底解析。 */
function resolveIR(result) {
  const { keyword, report, templateId, ir } = result || {}
  if (ir && Array.isArray(ir.sections) && ir.sections.length) return ir
  return markdownToIR(report || '', { keyword, templateId })
}

/** 等待下一帧，确保 DOM 与图表完成渲染。 */
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
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
  const accent = ir.meta?.accent || '#1d1d1f'

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
        trend.riskLevel.level
      )}（${trend.riskLevel.score}）</span>`
    : ''

  // 屏幕外容器：A4 内容宽度约 760px（794px 减去左右边距）
  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#1d1d1f;' +
    'font-family:"Microsoft YaHei",system-ui,sans-serif;line-height:1.75;padding:8px;'
  container.innerHTML = `
    <style>
      .pdf-root h1.main { font-size:24px; margin:0 0 6px; color:#1d1d1f; }
      .pdf-root .meta { color:#6e6e73; font-size:12.5px; }
      .pdf-root header { border-bottom:2px solid ${accent}; padding-bottom:14px; margin-bottom:18px; }
      .pdf-root .badge { display:inline-block; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px; }
      .pdf-root .cards { display:flex; gap:16px; margin:16px 0; }
      .pdf-root .card { flex:1; border:1px solid #e1e1e4; border-radius:10px; padding:12px; }
      .pdf-root .card h3 { margin:0 0 8px; font-size:14px; color:#48484a; }
      .pdf-root .chart { width:100%; height:230px; }
      .pdf-root h2 { font-size:17px; margin:18px 0 8px; color:#1d1d1f; border-left:4px solid ${accent}; padding-left:10px; }
      .pdf-root ul, .pdf-root ol { padding-left:22px; margin:6px 0; }
      .pdf-root blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid ${accent}; background:#f5f5f7; color:#48484a; }
      .pdf-root sup.cite { color:${accent}; font-size:11px; }
      .pdf-root .ir-toc { border:1px solid #e1e1e4; border-radius:10px; padding:12px 16px; margin:14px 0; }
      .pdf-root .ir-toc .toc-title { font-weight:700; margin-bottom:6px; color:#48484a; }
      .pdf-root .ir-toc a { color:${accent}; text-decoration:none; }
      .pdf-root .ir-section { page-break-inside:avoid; }
      .pdf-root .sources li { margin-bottom:5px; font-size:13px; list-style:none; }
      .pdf-root .sources { padding-left:0; }
      .pdf-root .sources .idx { color:${accent}; margin-right:4px; }
      .pdf-root .dim { color:#a1a1a6; font-size:12px; }
      .pdf-root footer { margin-top:26px; color:#a1a1a6; font-size:12px; text-align:center; }
    </style>
    <div class="pdf-root">
      <header>
        <h1 class="main">${escapeHtml(templateName)}：${escapeHtml(keyword || '')} ${riskBadge}</h1>
        <div class="meta">生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成</div>
      </header>
      <div class="cards">
        <div class="card"><h3>情感分布</h3><div id="pdf-pie" class="chart"></div></div>
        <div class="card"><h3>关键词热度 Top</h3><div id="pdf-bar" class="chart"></div></div>
      </div>
      ${irToTocHtml(ir)}
      <div class="report">${irToContentHtml(ir)}</div>
      <h2>信息来源</h2>
      <ul class="sources">${sourcesHtml}</ul>
      <footer>AgentMind · AI 多智能体舆情分析系统</footer>
    </div>`

  document.body.appendChild(container)

  const pieEl = container.querySelector('#pdf-pie')
  const barEl = container.querySelector('#pdf-bar')
  const pie = echarts.init(pieEl, null, { renderer: 'canvas' })
  const bar = echarts.init(barEl, null, { renderer: 'canvas' })

  // 关闭动画，确保截图时图表已完整渲染
  pie.setOption({
    animation: false,
    tooltip: { show: false },
    legend: { bottom: 0, textStyle: { color: '#6e6e73' }, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        label: { color: '#1d1d1f', formatter: '{b}\n{d}%' },
        data: [
          { value: s.positive, name: '正面', itemStyle: { color: '#34c759' } },
          { value: s.negative, name: '负面', itemStyle: { color: '#ff3b30' } },
          { value: s.neutral, name: '中性', itemStyle: { color: '#007aff' } }
        ]
      }
    ]
  })

  const topKw = [...keywords].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10).reverse()
  bar.setOption({
    animation: false,
    tooltip: { show: false },
    grid: { left: 80, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#6e6e73' }, splitLine: { lineStyle: { color: '#e1e1e4' } } },
    yAxis: { type: 'category', data: topKw.map((k) => k.word), axisLabel: { color: '#1d1d1f' } },
    series: [{ type: 'bar', data: topKw.map((k) => k.weight || 0), itemStyle: { color: '#007aff', borderRadius: [0, 4, 4, 0] } }]
  })

  const kw = (keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
  const filename = `舆情报告_${kw}_${Date.now()}.pdf`

  try {
    // 等待两帧让 ECharts 完成 canvas 绘制
    await nextFrame()

    await html2pdf()
      .set({
        margin: [10, 10, 12, 10], // mm，上右下左
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(container)
      .save()
  } finally {
    pie.dispose()
    bar.dispose()
    container.remove()
  }
}
