import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

/**
 * ChartPanel —— 数据可视化区
 * 情感分布饼图 + 关键词标签云（用 echarts 图形化，适配深色模式）。
 * @param {Object} props.analyze  分析 Agent 结果 { sentiment, keywords }
 * @param {Object} props.trend    趋势预测结果（用于风险等级展示）
 */
export default function ChartPanel({ analyze, trend }) {
  const pieRef = useRef(null)
  const wordRef = useRef(null)
  const pieChart = useRef(null)
  const wordChart = useRef(null)

  // 情感饼图
  useEffect(() => {
    if (!pieRef.current || !analyze?.sentiment) return
    if (!pieChart.current) pieChart.current = echarts.init(pieRef.current)
    const s = analyze.sentiment

    pieChart.current.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
      legend: {
        bottom: 0,
        textStyle: { color: '#6e6e73' },
        icon: 'circle'
      },
      series: [
        {
          name: '情感分布',
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: '#ffffff', borderWidth: 3 },
          label: { color: '#1d1d1f', formatter: '{b}\n{d}%' },
          data: [
            { value: s.positive, name: '正面', itemStyle: { color: '#34c759' } },
            { value: s.negative, name: '负面', itemStyle: { color: '#ff3b30' } },
            { value: s.neutral, name: '中性', itemStyle: { color: '#007aff' } }
          ]
        }
      ]
    })
  }, [analyze])

  // 关键词热度 Top 横向柱状图（比随机词云更直观、可读）
  useEffect(() => {
    if (!wordRef.current || !analyze?.keywords?.length) return
    if (!wordChart.current) wordChart.current = echarts.init(wordRef.current)

    const top = [...analyze.keywords]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 10)
      .reverse()

    const colors = ['#007aff', '#5856d6', '#32ade6', '#6e6e73', '#a1a1a6']

    wordChart.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p) => `${p[0].name}：热度 ${p[0].value}`
      },
      grid: { left: 78, right: 24, top: 8, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#6e6e73' },
        splitLine: { lineStyle: { color: 'rgba(29,29,31,0.06)' } }
      },
      yAxis: {
        type: 'category',
        data: top.map((k) => k.word),
        axisLabel: { color: '#48484a' },
        axisLine: { lineStyle: { color: 'rgba(29,29,31,0.15)' } }
      },
      series: [
        {
          type: 'bar',
          data: top.map((k, i) => ({
            value: k.weight || 0,
            itemStyle: {
              color: colors[i % colors.length],
              borderRadius: [0, 4, 4, 0]
            }
          })),
          barWidth: '55%',
          label: { show: true, position: 'right', color: '#6e6e73', fontSize: 11 }
        }
      ]
    })
  }, [analyze])

  // 响应式
  useEffect(() => {
    const resize = () => {
      pieChart.current?.resize()
      wordChart.current?.resize()
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <section className="card chart-panel">
      <h2 className="card-title">
        <span className="title-bar" />
        数据可视化
        {trend?.riskLevel && (
          <span
            className="risk-badge"
            style={{ background: trend.riskLevel.color }}
          >
            风险 {trend.riskLevel.level}（{trend.riskLevel.score}）
          </span>
        )}
      </h2>
      <div className="chart-grid">
        <div className="chart-box">
          <div className="chart-label">情感分布</div>
          <div ref={pieRef} className="chart-canvas" />
        </div>
        <div className="chart-box">
          <div className="chart-label">关键词热度 Top10</div>
          <div ref={wordRef} className="chart-canvas" />
        </div>
      </div>
    </section>
  )
}
