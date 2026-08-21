/**
 * htmlReport.js —— 交互式 HTML 报告 + 打印视图
 * ---------------------------------------------------
 * 交互式 HTML 样式对齐首页「报告预览」模块（浅色稿纸、侧栏目录、指标卡、青蓝图表）。
 * 打印视图仍为 A4 浅色，供浏览器打印 / PDF 兜底。
 */

import { markdownToIR, irToContentHtml, escapeHtml } from '../report/ir.js'

/** 从 result 取得 IR：优先用已生成的 result.ir，否则由 Markdown 兜底解析。 */
function resolveIR(result) {
  const { keyword, report, templateId, ir } = result || {}
  if (ir && Array.isArray(ir.sections) && ir.sections.length) return ir
  return markdownToIR(report || '', { keyword, templateId })
}

function reportMeta(result, ir) {
  const { keyword, analyze, trend, sources = [], cleaned, raw } = result || {}
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')
  const templateName = ir.meta?.templateName || '舆情分析报告'
  const sampleCount = (cleaned || raw || sources || []).length
  const sentimentIndex = Math.round(
    (Number(s.positive) || 0) * 0.7 + (Number(s.neutral) || 0) * 0.3
  )
  return { keyword, s, keywords, generatedAt, templateName, sampleCount, sentimentIndex, trend, sources }
}

/** 图表脚本：对齐首页 ReportPreview 配色 */
function chartScript(s, keywords) {
  return `
  const sentiment = ${JSON.stringify(s)};
  const keywords = ${JSON.stringify(keywords)};
  echarts.init(document.getElementById('pie')).setOption({
    tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#E2E8F0',
      textStyle:{color:'#334155',fontSize:12},formatter:'{b}: {c}% ({d}%)'},
    legend:{orient:'vertical',right:10,top:'center',itemWidth:10,itemHeight:10,itemGap:12,
      textStyle:{color:'#64748B',fontSize:12}},
    series:[{type:'pie',radius:['55%','75%'],center:['35%','50%'],
      itemStyle:{borderRadius:4,borderColor:'#F8FAFC',borderWidth:2},
      label:{show:false},labelLine:{show:false},
      data:[
        {value:sentiment.positive,name:'正面',itemStyle:{color:'#10B981'}},
        {value:sentiment.neutral,name:'中性',itemStyle:{color:'#94A3B8'}},
        {value:sentiment.negative,name:'负面',itemStyle:{color:'#2563EB'}}
      ]}]
  });
  const topKw = [...keywords].sort((a,b)=>(b.weight||0)-(a.weight||0)).slice(0,10).reverse();
  echarts.init(document.getElementById('bar')).setOption({
    tooltip:{trigger:'axis',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#E2E8F0',
      textStyle:{color:'#334155',fontSize:12},axisPointer:{type:'shadow'}},
    grid:{left:'3%',right:'8%',bottom:'3%',top:'8%',containLabel:true},
    xAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#64748B',fontSize:11},
      splitLine:{lineStyle:{color:'#E2E8F0',type:'dashed'}}},
    yAxis:{type:'category',data:topKw.map(k=>k.word),
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#94A3B8',fontSize:11}},
    series:[{type:'bar',barWidth:10,data:topKw.map(k=>k.weight||0),
      itemStyle:{borderRadius:[0,2,2,0],
        color:new echarts.graphic.LinearGradient(0,0,1,0,[
          {offset:0,color:'rgba(14,165,233,0.25)'},{offset:1,color:'#0EA5E9'}
        ])}}]
  });`
}

function tocNavHtml(ir) {
  const sections = ir?.sections || []
  if (!sections.length) return '<div class="nav-empty">暂无目录</div>'
  return sections
    .map(
      (sec, i) =>
        `<a class="nav-item" href="#${escapeHtml(sec.id || '')}">
          <span class="nav-idx">${String(i + 1).padStart(2, '0')}</span>
          <span class="nav-label">${escapeHtml(sec.title || `章节 ${i + 1}`)}</span>
        </a>`
    )
    .join('\n')
}

/**
 * 生成完整的交互式 HTML 报告（对齐首页报告预览样式）。
 * @param {Object} result 完整分析结果
 * @returns {string} HTML 文本
 */
export function buildHtmlReport(result) {
  const ir = resolveIR(result)
  const { keyword, s, keywords, generatedAt, templateName, sampleCount, sentimentIndex, trend, sources } =
    reportMeta(result, ir)

  const fileHint = `report_${escapeHtml(keyword || '舆情分析')}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.html`
  const risk = trend?.riskLevel
  const riskColor = risk?.color || '#F97316'
  const riskLabel = risk ? escapeHtml(String(risk.level)) : '—'
  const riskScore = risk?.score != null ? risk.score : '—'
  const riskDesc = risk?.desc ? escapeHtml(String(risk.desc).slice(0, 24)) : '综合研判'

  const sourcesHtml = sources.length
    ? sources
        .map(
          (src, i) =>
            `<li><span class="idx">[${i + 1}]</span> <a href="${escapeHtml(src.url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(
              src.title || src.url || '未命名来源'
            )}</a>${src.displayUrl ? ` <span class="dim">${escapeHtml(src.displayUrl)}</span>` : ''}</li>`
        )
        .join('\n')
    : '<li class="dim">无来源信息</li>'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(templateName)} - ${escapeHtml(keyword || '')}</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\/script>
<style>
  :root {
    --ink-50:#0F172A; --ink-100:#1E293B; --ink-200:#334155; --ink-300:#475569;
    --ink-400:#64748B; --ink-500:#94A3B8;
    --surface:#FFFFFF; --surface-2:#F8FAFC; --surface-3:#F1F5F9;
    --border:#E2E8F0; --border-strong:#CBD5E1;
    --cyan:#0EA5E9; --signal:#F97316; --chartreuse:#10B981; --blue:#2563EB;
    --radius-md:10px; --radius-xl:16px;
    --font-body:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
    --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --font-display:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin:0; background:#EEF2F7; color:var(--ink-200);
    font-family:var(--font-body); line-height:1.7;
  }
  .page { max-width:1100px; margin:32px auto 64px; padding:0 16px; }
  .mockup {
    background:#0F172A; border:1px solid var(--border-strong); border-radius:var(--radius-xl);
    overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,.08),0 4px 12px rgba(15,23,42,.04);
  }
  .chrome {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 20px; background:var(--surface); border-bottom:1px solid var(--border);
  }
  .chrome-left { display:flex; align-items:center; gap:12px; }
  .dots { display:flex; gap:6px; }
  .dot { width:10px; height:10px; border-radius:50%; }
  .dot.r { background:#FF5F57; } .dot.y { background:#FEBC2E; } .dot.g { background:#28C840; }
  .fname { font-family:var(--font-mono); font-size:11px; color:var(--ink-400); }
  .fmt { display:flex; gap:8px; }
  .fmt span {
    padding:4px 10px; font-size:11px; font-family:var(--font-mono); border-radius:4px;
    color:var(--ink-400); border:1px solid var(--border);
  }
  .fmt span.on { color:var(--cyan); background:rgba(14,165,233,.08); border-color:rgba(14,165,233,.3); }
  .layout { display:flex; background:var(--surface); min-height:560px; }
  .sidebar {
    width:220px; flex-shrink:0; padding:24px 16px; border-right:1px solid var(--border);
    background:var(--surface);
  }
  .side-label {
    font-family:var(--font-mono); font-size:10px; color:var(--ink-500);
    letter-spacing:.1em; margin-bottom:12px; padding:0 8px;
  }
  .nav-item {
    display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px;
    font-size:13px; color:var(--ink-300); text-decoration:none; margin-bottom:2px;
  }
  .nav-item:hover, .nav-item:target { background:var(--surface-3); color:var(--ink-50); }
  .nav-idx { font-family:var(--font-mono); font-size:10px; color:var(--ink-500); width:18px; }
  .nav-item:hover .nav-idx { color:var(--cyan); }
  .nav-empty { font-size:12px; color:var(--ink-500); padding:0 8px; }
  .side-meta { margin-top:24px; padding-top:16px; border-top:1px solid var(--border); }
  .meta-row { padding:0 8px; margin-bottom:10px; }
  .meta-k { font-size:10px; color:var(--ink-500); }
  .meta-v { font-size:12px; color:var(--ink-200); margin-top:2px; }
  .content { flex:1; padding:28px 32px; min-width:0; }
  .badges { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .badge {
    display:inline-block; font-size:11px; padding:3px 10px; border-radius:999px;
    font-weight:600;
  }
  .badge-signal { background:rgba(249,115,22,.12); color:var(--signal); border:1px solid rgba(249,115,22,.25); }
  .badge-cyan { background:rgba(14,165,233,.1); color:var(--cyan); border:1px solid rgba(14,165,233,.25); }
  h1.title { font-size:24px; font-weight:700; margin:0 0 6px; color:var(--ink-50); font-family:var(--font-display); }
  .subtitle { font-size:13px; color:var(--ink-400); margin:0 0 24px; }
  .metrics {
    display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px;
  }
  .metric {
    background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-md);
    padding:14px 16px;
  }
  .metric .k { font-size:11px; color:var(--ink-400); margin-bottom:6px; }
  .metric .v {
    font-size:22px; font-weight:700; color:var(--ink-50); font-family:var(--font-display);
    letter-spacing:-.01em; line-height:1.2; margin-bottom:4px;
  }
  .metric .hint { font-size:11px; color:var(--ink-400); }
  .charts { display:grid; grid-template-columns:1fr 1.5fr; gap:16px; margin-bottom:24px; }
  .chart-card {
    background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-md);
    padding:16px 18px;
  }
  .chart-card h3 { margin:0 0 4px; font-size:13px; font-weight:600; color:var(--ink-100); }
  .chart-card .sub { font-size:11px; color:var(--ink-500); margin-bottom:8px; }
  .chart { width:100%; height:220px; }
  .report-body { margin-top:8px; }
  .ir-section { margin-bottom:22px; }
  .ir-section h2 {
    font-size:17px; margin:0 0 12px; color:var(--ink-50);
    border-left:3px solid var(--cyan); padding-left:10px;
  }
  .ir-section p { margin:0 0 10px; font-size:14px; color:var(--ink-200); }
  .ir-section ul, .ir-section ol { padding-left:22px; margin:6px 0 12px; }
  .ir-section li { margin-bottom:4px; font-size:14px; }
  blockquote {
    margin:10px 0; padding:10px 14px; border-left:3px solid var(--cyan);
    background:rgba(14,165,233,.06); color:var(--ink-200); border-radius:0 8px 8px 0;
  }
  sup.cite { color:var(--cyan); font-size:11px; font-family:var(--font-mono); }
  .sources-wrap {
    margin-top:28px; background:var(--surface-2); border:1px solid var(--border);
    border-radius:var(--radius-md); padding:18px 20px;
  }
  .sources-wrap h2 { margin:0 0 12px; font-size:14px; color:var(--ink-100); }
  .sources { padding-left:0; list-style:none; margin:0; }
  .sources li { margin-bottom:8px; font-size:13px; }
  .sources .idx { color:var(--cyan); margin-right:4px; font-family:var(--font-mono); font-size:11px; }
  .dim { color:var(--ink-500); font-size:12px; }
  a { color:var(--cyan); }
  footer {
    margin-top:28px; padding-top:16px; border-top:1px solid var(--border);
    color:var(--ink-500); font-size:12px; text-align:center;
  }
  @media (max-width:860px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; border-right:none; border-bottom:1px solid var(--border); }
    .metrics { grid-template-columns:1fr 1fr; }
    .charts { grid-template-columns:1fr; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="mockup">
    <div class="chrome">
      <div class="chrome-left">
        <div class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
        <span class="fname">${fileHint}</span>
      </div>
      <div class="fmt"><span class="on">HTML</span><span>PDF</span><span>MD</span></div>
    </div>
    <div class="layout">
      <aside class="sidebar">
        <div class="side-label">报告目录</div>
        ${tocNavHtml(ir)}
        <div class="side-meta">
          <div class="side-label">报告信息</div>
          <div class="meta-row"><div class="meta-k">分析对象</div><div class="meta-v">${escapeHtml(keyword || '—')}</div></div>
          <div class="meta-row"><div class="meta-k">生成时间</div><div class="meta-v">${escapeHtml(generatedAt)}</div></div>
          <div class="meta-row"><div class="meta-k">样本量</div><div class="meta-v">${sampleCount} 条</div></div>
        </div>
      </aside>
      <main class="content">
        <div class="badges">
          <span class="badge badge-signal">${escapeHtml(templateName)}</span>
          <span class="badge badge-cyan">v1.0</span>
        </div>
        <h1 class="title">${escapeHtml(keyword || '')} 网络舆情分析报告</h1>
        <p class="subtitle">生成时间：${escapeHtml(generatedAt)} · 由 AgentMind 多智能体系统自动生成</p>

        <div class="metrics">
          <div class="metric">
            <div class="k">声量总量</div>
            <div class="v">${sampleCount.toLocaleString('zh-CN')}</div>
            <div class="hint">采集样本条数</div>
          </div>
          <div class="metric">
            <div class="k">情感指数</div>
            <div class="v">${sentimentIndex}</div>
            <div class="hint">正面加权估算</div>
          </div>
          <div class="metric">
            <div class="k">负面占比</div>
            <div class="v">${Number(s.negative) || 0}%</div>
            <div class="hint">需重点关注</div>
          </div>
          <div class="metric">
            <div class="k">风险等级</div>
            <div class="v" style="color:${escapeHtml(riskColor)}">${riskLabel}</div>
            <div class="hint">${riskScore} / 100 · ${riskDesc}</div>
          </div>
        </div>

        <div class="charts">
          <div class="chart-card">
            <h3>情感分布</h3>
            <div class="sub">按情感倾向分类占比</div>
            <div id="pie" class="chart"></div>
          </div>
          <div class="chart-card">
            <h3>关键词热度 Top10</h3>
            <div class="sub">按讨论热度排序</div>
            <div id="bar" class="chart"></div>
          </div>
        </div>

        <div class="report-body">
          ${irToContentHtml(ir)}
        </div>

        <div class="sources-wrap">
          <h2>信息来源（${sources.length}）</h2>
          <ul class="sources">${sourcesHtml}</ul>
        </div>

        <footer>AgentMind · AI 多智能体舆情分析系统</footer>
      </main>
    </div>
  </div>
</div>
<script>${chartScript(s, keywords)}<\/script>
</body>
</html>`
}

/**
 * 下载交互式 HTML 报告。
 * @param {Object} result
 */
export function downloadHtmlReport(result) {
  const html = buildHtmlReport(result)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const kw = String(result?.keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
  a.href = url
  a.download = `舆情报告_${kw}_${Date.now()}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * 生成打印视图 HTML（浅色、A4 友好）。
 * @param {Object} result 完整分析结果
 * @param {boolean} [autoPrint=true]
 * @returns {string}
 */
export function buildPrintableReport(result, autoPrint = true) {
  const ir = resolveIR(result)
  const { keyword, s, keywords, generatedAt, templateName, trend, sources } = reportMeta(result, ir)
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

  const printHook = autoPrint
    ? `window.onload = function(){ setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 600); };`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(templateName)} - ${escapeHtml(keyword || '')}</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\/script>
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#0F172A; font-family:"Microsoft YaHei",system-ui,sans-serif; line-height:1.75; }
  .wrap { max-width:820px; margin:0 auto; padding:32px 28px 60px; }
  header { border-bottom:2px solid ${accent}; padding-bottom:16px; margin-bottom:22px; }
  h1.main { font-size:24px; margin:0 0 6px; color:#0F172A; }
  .meta { color:#64748B; font-size:12.5px; }
  .badge { display:inline-block; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px; }
  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:20px 0; }
  .card { border:1px solid #E2E8F0; border-radius:10px; padding:14px; background:#F8FAFC; }
  .card h3 { margin:0 0 8px; font-size:14px; color:#475569; }
  .chart { width:100%; height:240px; }
  h2 { font-size:17px; margin-top:22px; color:#0F172A; border-left:4px solid ${accent}; padding-left:10px; }
  ul,ol { padding-left:22px; }
  blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid ${accent}; background:#F8FAFC; color:#475569; }
  sup.cite { color:${accent}; font-size:11px; }
  .sources li { margin-bottom:5px; font-size:13px; }
  .sources .idx { color:${accent}; margin-right:4px; }
  .dim { color:#94A3B8; font-size:12px; }
  footer { margin-top:32px; color:#94A3B8; font-size:12px; text-align:center; }
  @page { size:A4; margin:16mm 14mm; }
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
  <div class="report">${irToContentHtml(ir)}</div>
  <h2>信息来源</h2>
  <ul class="sources">${sourcesHtml}</ul>
  <footer>AgentMind · AI 多智能体舆情分析系统</footer>
</div>
<script>${chartScript(s, keywords)}\n${printHook}<\/script>
</body>
</html>`
}
