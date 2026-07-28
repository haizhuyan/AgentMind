/**
 * htmlReport.js —— 交互式 HTML 报告 + 打印/PDF 视图生成
 * ---------------------------------------------------
 * 参考 BettaFish 的 ReportEngine：以 Document IR 为中心，将分析结果装订为
 *   - 交互式 HTML（深色，内嵌 ECharts 图表，用于导出/离线查看）；
 *   - 打印视图（浅色、A4 友好，用于浏览器"打印为 PDF"）。
 */

import { markdownToIR, irToContentHtml, irToTocHtml, escapeHtml } from '../report/ir.js'

/** 从 result 取得 IR：优先用已生成的 result.ir，否则由 Markdown 兜底解析。 */
function resolveIR(result) {
  const { keyword, report, templateId, ir } = result || {}
  if (ir && Array.isArray(ir.sections) && ir.sections.length) return ir
  return markdownToIR(report || '', { keyword, templateId })
}

/** 生成情感/关键词图表所需的公共脚本片段。 */
function chartScript(s, keywords, theme) {
  const isDark = theme === 'dark'
  const axisColor = isDark ? '#9aa8c7' : '#64748b'
  const labelColor = isDark ? '#e8edf7' : '#1e293b'
  const splitColor = isDark ? '#1e2a4a' : '#e4e9f2'
  const borderColor = isDark ? '#111a33' : '#ffffff'
  return `
  const sentiment = ${JSON.stringify(s)};
  const keywords = ${JSON.stringify(keywords)};
  echarts.init(document.getElementById('pie')).setOption({
    tooltip:{trigger:'item',formatter:'{b}: {c}% ({d}%)'},
    legend:{bottom:0,textStyle:{color:'${axisColor}'},icon:'circle'},
    series:[{type:'pie',radius:['42%','68%'],center:['50%','44%'],
      itemStyle:{borderColor:'${borderColor}',borderWidth:3},
      label:{color:'${labelColor}',formatter:'{b}\\n{d}%'},
      data:[
        {value:sentiment.positive,name:'正面',itemStyle:{color:'#22c55e'}},
        {value:sentiment.negative,name:'负面',itemStyle:{color:'#ef4444'}},
        {value:sentiment.neutral,name:'中性',itemStyle:{color:'#60a5fa'}}
      ]}]
  });
  const topKw = [...keywords].sort((a,b)=>(b.weight||0)-(a.weight||0)).slice(0,10).reverse();
  echarts.init(document.getElementById('bar')).setOption({
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    grid:{left:80,right:20,top:10,bottom:20},
    xAxis:{type:'value',axisLabel:{color:'${axisColor}'},splitLine:{lineStyle:{color:'${splitColor}'}}},
    yAxis:{type:'category',data:topKw.map(k=>k.word),axisLabel:{color:'${labelColor}'}},
    series:[{type:'bar',data:topKw.map(k=>k.weight||0),
      itemStyle:{color:'#38bdf8',borderRadius:[0,4,4,0]}}]
  });`
}

/**
 * 生成完整的交互式 HTML 报告字符串（深色，内嵌图表）。
 * @param {Object} result 完整分析结果（runAgentFlow 的返回值）
 * @returns {string} HTML 文本
 */
export function buildHtmlReport(result) {
  const { keyword, analyze, trend, sources = [] } = result || {}
  const ir = resolveIR(result)
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')
  const templateName = ir.meta?.templateName || '舆情分析报告'

  const sourcesHtml = sources.length
    ? sources
        .map(
          (src, i) =>
            `<li><span class="idx">[${i + 1}]</span> <a href="${src.url || '#'}" target="_blank" rel="noreferrer">${escapeHtml(
              src.title || src.url || '未命名来源'
            )}</a> ${src.displayUrl ? `<span class="dim">${escapeHtml(src.displayUrl)}</span>` : ''}</li>`
        )
        .join('\n')
    : '<li class="dim">无来源信息</li>'

  const riskBadge = trend?.riskLevel
    ? `<span class="badge" style="background:${trend.riskLevel.color}">风险 ${escapeHtml(
        trend.riskLevel.level
      )}（${trend.riskLevel.score}）</span>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(templateName)} - ${escapeHtml(keyword || '')}</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#0b1228; color:#e8edf7; font-family:"Microsoft YaHei",system-ui,sans-serif; line-height:1.7; }
  .wrap { max-width:960px; margin:0 auto; padding:40px 24px 80px; }
  header { border-bottom:1px solid #1e2a4a; padding-bottom:20px; margin-bottom:28px; }
  h1.main { font-size:26px; margin:0 0 8px; }
  .meta { color:#9aa8c7; font-size:13px; }
  .badge { display:inline-block; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px; }
  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
  .card { background:#111a33; border:1px solid #1e2a4a; border-radius:12px; padding:16px; }
  .card h3 { margin:0 0 12px; font-size:15px; color:#c7d2e8; }
  .chart { width:100%; height:280px; }
  h1,h2 { color:#dbe4f7; }
  h2 { font-size:18px; margin-top:28px; border-left:3px solid #38bdf8; padding-left:10px; }
  ul,ol { padding-left:22px; }
  blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid #38bdf8; background:rgba(56,189,248,0.08); color:#c7d2e8; }
  sup.cite { color:#38bdf8; font-size:11px; }
  .ir-toc { background:#111a33; border:1px solid #1e2a4a; border-radius:12px; padding:14px 18px; margin:20px 0; }
  .ir-toc .toc-title { font-weight:700; margin-bottom:6px; color:#c7d2e8; }
  .ir-toc a { color:#9fc7ff; text-decoration:none; }
  .sources li { margin-bottom:6px; font-size:14px; }
  .sources .idx { color:#38bdf8; margin-right:4px; }
  .dim { color:#6b7a9e; font-size:12px; }
  a { color:#38bdf8; }
  footer { margin-top:40px; color:#6b7a9e; font-size:12px; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1 class="main">${escapeHtml(templateName)}：${escapeHtml(keyword || '')} ${riskBadge}</h1>
    <div class="meta">生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成</div>
  </header>

  <div class="cards">
    <div class="card"><h3>情感分布</h3><div id="pie" class="chart"></div></div>
    <div class="card"><h3>关键词热度 Top</h3><div id="bar" class="chart"></div></div>
  </div>

  ${irToTocHtml(ir)}

  <div class="report">
    ${irToContentHtml(ir)}
  </div>

  <h2>信息来源</h2>
  <ul class="sources">
    ${sourcesHtml}
  </ul>

  <footer>AgentMind · AI 多智能体舆情分析系统</footer>
</div>

<script>${chartScript(s, keywords, 'dark')}</script>
</body>
</html>`
}

/**
 * 生成打印视图 HTML（浅色、A4 友好，加载后自动触发打印，用于"打印为 PDF"）。
 * @param {Object} result 完整分析结果
 * @param {boolean} [autoPrint=true] 是否加载后自动调用 window.print()
 * @returns {string} HTML 文本
 */
export function buildPrintableReport(result, autoPrint = true) {
  const { keyword, analyze, trend, sources = [] } = result || {}
  const ir = resolveIR(result)
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')
  const templateName = ir.meta?.templateName || '舆情分析报告'
  const accent = ir.meta?.accent || '#2563eb'

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

  const printHook = autoPrint
    ? `window.onload = function(){ setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 600); };`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(templateName)} - ${escapeHtml(keyword || '')}</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#1e293b; font-family:"Microsoft YaHei",system-ui,sans-serif; line-height:1.75; }
  .wrap { max-width:820px; margin:0 auto; padding:32px 28px 60px; }
  header { border-bottom:2px solid ${accent}; padding-bottom:16px; margin-bottom:22px; }
  h1.main { font-size:24px; margin:0 0 6px; color:#0f172a; }
  .meta { color:#64748b; font-size:12.5px; }
  .badge { display:inline-block; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px; }
  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:20px 0; }
  .card { border:1px solid #e4e9f2; border-radius:10px; padding:14px; }
  .card h3 { margin:0 0 8px; font-size:14px; color:#334155; }
  .chart { width:100%; height:240px; }
  h2 { font-size:17px; margin-top:22px; color:#0f172a; border-left:4px solid ${accent}; padding-left:10px; }
  ul,ol { padding-left:22px; }
  blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid ${accent}; background:#f1f5f9; color:#334155; }
  sup.cite { color:${accent}; font-size:11px; }
  .ir-toc { border:1px solid #e4e9f2; border-radius:10px; padding:12px 16px; margin:16px 0; page-break-inside:avoid; }
  .ir-toc .toc-title { font-weight:700; margin-bottom:6px; color:#334155; }
  .ir-toc a { color:${accent}; text-decoration:none; }
  .ir-section { page-break-inside:avoid; }
  .sources li { margin-bottom:5px; font-size:13px; }
  .sources .idx { color:${accent}; margin-right:4px; }
  .dim { color:#94a3b8; font-size:12px; }
  footer { margin-top:32px; color:#94a3b8; font-size:12px; text-align:center; }
  @page { size:A4; margin:16mm 14mm; }
  @media print {
    .cards { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    a { color:${accent}; text-decoration:none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1 class="main">${escapeHtml(templateName)}：${escapeHtml(keyword || '')} ${riskBadge}</h1>
    <div class="meta">生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成</div>
  </header>

  <div class="cards">
    <div class="card"><h3>情感分布</h3><div id="pie" class="chart"></div></div>
    <div class="card"><h3>关键词热度 Top</h3><div id="bar" class="chart"></div></div>
  </div>

  ${irToTocHtml(ir)}

  <div class="report">
    ${irToContentHtml(ir)}
  </div>

  <h2>信息来源</h2>
  <ul class="sources">
    ${sourcesHtml}
  </ul>

  <footer>AgentMind · AI 多智能体舆情分析系统</footer>
</div>

<script>${chartScript(s, keywords, 'light')}\n${printHook}</script>
</body>
</html>`
}
