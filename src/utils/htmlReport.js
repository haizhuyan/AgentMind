/**
 * htmlReport.js —— 交互式 HTML 报告生成
 * ---------------------------------------------------
 * 参考 BettaFish 的 ReportEngine：将分析结果装订为一份自包含、
 * 可离线打开的交互式 HTML 报告（内嵌 ECharts 图表 + 报告正文 + 来源）。
 */

// 极简 Markdown → HTML（标题/加粗/列表/段落），足够报告展示
function mdToHtml(md = '') {
  const lines = String(md).split('\n')
  const out = []
  let inList = false

  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      closeList()
      continue
    }
    const esc = (s) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const inline = (s) =>
      esc(s)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(\d+)\]/g, '<sup class="cite">[$1]</sup>')

    if (t.startsWith('## ')) {
      closeList()
      out.push(`<h2>${inline(t.slice(3))}</h2>`)
    } else if (t.startsWith('# ')) {
      closeList()
      out.push(`<h1>${inline(t.slice(2))}</h1>`)
    } else if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(t.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, ''))}</li>`)
    } else {
      closeList()
      out.push(`<p>${inline(t)}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

/**
 * 生成完整的交互式 HTML 报告字符串。
 * @param {Object} result 完整分析结果（runAgentFlow 的返回值）
 * @returns {string} HTML 文本
 */
export function buildHtmlReport(result) {
  const { keyword, analyze, insight, trend, debate, sources = [], report } = result || {}
  const s = analyze?.sentiment || { positive: 0, negative: 0, neutral: 0 }
  const keywords = analyze?.keywords || []
  const generatedAt = new Date().toLocaleString('zh-CN')

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
<title>舆情分析报告 - ${escapeHtml(keyword || '')}</title>
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
  ul { padding-left:22px; }
  sup.cite { color:#38bdf8; font-size:11px; }
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
    <h1 class="main">舆情分析报告：${escapeHtml(keyword || '')} ${riskBadge}</h1>
    <div class="meta">生成时间：${generatedAt} ｜ 由 AgentMind 多智能体系统自动生成</div>
  </header>

  <div class="cards">
    <div class="card"><h3>情感分布</h3><div id="pie" class="chart"></div></div>
    <div class="card"><h3>关键词热度 Top</h3><div id="bar" class="chart"></div></div>
  </div>

  <section class="report">
    ${mdToHtml(report || '')}
  </section>

  <h2>信息来源</h2>
  <ul class="sources">
    ${sourcesHtml}
  </ul>

  <footer>AgentMind · AI 多智能体舆情分析系统</footer>
</div>

<script>
  const sentiment = ${JSON.stringify(s)};
  const keywords = ${JSON.stringify(keywords)};

  echarts.init(document.getElementById('pie')).setOption({
    tooltip:{trigger:'item',formatter:'{b}: {c}% ({d}%)'},
    legend:{bottom:0,textStyle:{color:'#9aa8c7'},icon:'circle'},
    series:[{type:'pie',radius:['42%','68%'],center:['50%','44%'],
      itemStyle:{borderColor:'#111a33',borderWidth:3},
      label:{color:'#e8edf7',formatter:'{b}\\n{d}%'},
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
    xAxis:{type:'value',axisLabel:{color:'#9aa8c7'},splitLine:{lineStyle:{color:'#1e2a4a'}}},
    yAxis:{type:'category',data:topKw.map(k=>k.word),axisLabel:{color:'#c7d2e8'}},
    series:[{type:'bar',data:topKw.map(k=>k.weight||0),
      itemStyle:{color:'#38bdf8',borderRadius:[0,4,4,0]}}]
  });
</script>
</body>
</html>`
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
