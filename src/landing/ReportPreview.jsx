/* ============================================================
   ReportPreview — Interactive report preview with real charts
   （从 homedemo 1:1 移植，ECharts 改从 npm 包导入）
   ============================================================ */

import { useState, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export default function ReportPreview() {
  const sentimentRef = useRef(null)
  const barRef = useRef(null)

  const [activeTab, setActiveTab] = useState('overview')
  const tabs = [
    { id: 'overview', label: '总览' },
    { id: 'sentiment', label: '情感分析' },
    { id: 'risk', label: '风险研判' },
    { id: 'sources', label: '来源溯源' },
  ]

  const [riskLevel] = useState('medium') // low / medium / high

  const riskConfig = {
    low: { label: '低风险', color: 'var(--chartreuse)', desc: '舆情整体平稳，无显著负面信号' },
    medium: { label: '中风险', color: 'var(--signal)', desc: '存在一定负面声量，建议关注关键传播节点' },
    high: { label: '高风险', color: 'var(--risk)', desc: '负面舆情发酵迅速，需启动危机应对机制' },
  }

  useEffect(() => {
    if (!sentimentRef.current) return

    const sentimentChart = echarts.init(sentimentRef.current)
    const sentimentOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: '#64748B', fontSize: 12 },
      },
      series: [
        {
          name: '情感分布',
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#F8FAFC',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetX: 0,
              shadowColor: 'rgba(37, 99, 235, 0.3)',
            },
          },
          labelLine: { show: false },
          data: [
            { value: 42.3, name: '正面', itemStyle: { color: '#10B981' } },
            { value: 31.8, name: '中性', itemStyle: { color: '#94A3B8' } },
            { value: 19.7, name: '负面', itemStyle: { color: '#2563EB' } },
            { value: 6.2, name: '质疑', itemStyle: { color: '#0EA5E9' } },
          ],
        },
      ],
    }
    sentimentChart.setOption(sentimentOption)

    const barChart = echarts.init(barRef.current)
    const barOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '3%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: [
          '用户体验',
          '售后服务',
          '产品质量',
          '价格评价',
          '品牌口碑',
          '物流配送',
          '功能需求',
          '竞品对比',
          '营销活动',
          '企业社会责任',
        ],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      series: [
        {
          name: '热度指数',
          type: 'bar',
          barWidth: 10,
          itemStyle: {
            borderRadius: [0, 2, 2, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(14, 165, 233, 0.25)' },
              { offset: 1, color: '#0EA5E9' },
            ]),
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: 'rgba(37, 99, 235, 0.35)' },
                { offset: 1, color: '#2563EB' },
              ]),
            },
          },
          data: [2847, 2431, 2156, 1892, 1654, 1423, 1287, 1056, 923, 789],
        },
      ],
    }
    barChart.setOption(barOption)

    const handleResize = () => {
      sentimentChart.resize()
      barChart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      sentimentChart.dispose()
      barChart.dispose()
    }
  }, [])

  const risk = riskConfig[riskLevel]

  return (
    <section id="report" className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div className="section-label">报告预览</div>
        <h2 className="section-heading">
          专业级舆情报告，
          <br />
          可直接作为交付报告
        </h2>
        <p className="section-subheading">
          四套行业报告模板，流式生成、结构化 IR 渲染、事实溯源标注[n]，
          支持交互式 HTML / A4 PDF / Markdown 多格式导出。
        </p>

        {/* Report mockup */}
        <div
          className="report-mockup"
          style={{
            background: 'var(--ink-950)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* Report header bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-400)',
                }}
              >
                report_品牌X舆情分析_20260820.html
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['HTML', 'PDF', 'MD'].map((fmt) => (
                <span
                  key={fmt}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: fmt === 'HTML' ? 'var(--cyan)' : 'var(--ink-400)',
                    background: fmt === 'HTML' ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                    border: `1px solid ${fmt === 'HTML' ? 'rgba(14, 165, 233, 0.3)' : 'var(--border)'}`,
                    borderRadius: 4,
                  }}
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* Report body */}
          <div style={{ display: 'flex' }} className="report-body">
            {/* Sidebar */}
            <div
              className="report-sidebar"
              style={{
                width: 220,
                flexShrink: 0,
                padding: '24px 16px',
                borderRight: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-500)',
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                  padding: '0 8px',
                }}
              >
                报告目录
              </div>
              {tabs.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: activeTab === t.id ? 'var(--ink-50)' : 'var(--ink-300)',
                    background: activeTab === t.id ? 'var(--surface-3)' : 'transparent',
                    marginBottom: 2,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: activeTab === t.id ? 'var(--cyan)' : 'var(--ink-500)',
                      width: 18,
                    }}
                  >
                    0{i + 1}
                  </span>
                  {t.label}
                </div>
              ))}

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    letterSpacing: '0.1em',
                    marginBottom: 12,
                    padding: '0 8px',
                  }}
                >
                  报告信息
                </div>
                <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>分析对象</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-200)', marginTop: 2 }}>品牌 X</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>采集时间</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-200)', marginTop: 2 }}>2026-08-20</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>样本量</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-200)', marginTop: 2 }}>2,847 条</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div
              className="report-content"
              style={{
                flex: 1,
                padding: '28px 32px',
                minHeight: 480,
              }}
            >
              {/* Title */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="badge badge-signal" style={{ fontSize: 11 }}>
                    品牌声誉分析报告
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: 11 }}>
                    v1.0
                  </span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                  品牌 X 网络舆情分析报告
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-400)' }}>
                  分析周期：2026-08-13 至 2026-08-20 · 数据来源：全网 7 大社媒平台 + 搜索 API
                </p>
              </div>

              {/* Key metrics row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 28,
                }}
                className="metrics-row"
              >
                {[
                  { label: '声量总量', value: '2,847', trend: '+12.3%', trendUp: true },
                  { label: '情感指数', value: '68.5', trend: '+2.1', trendUp: true },
                  { label: '负面占比', value: '19.7%', trend: '-1.8%', trendUp: false },
                  { label: '风险等级', value: risk.label, color: risk.color, risk: true },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-400)',
                        marginBottom: 6,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: m.color || 'var(--ink-50)',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        marginBottom: 4,
                      }}
                    >
                      {m.value}
                    </div>
                    {m.risk ? (
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{risk.desc.slice(0, 12)}...</div>
                    ) : (
                      <div
                        style={{
                          fontSize: 11,
                          color: m.trendUp ? 'var(--chartreuse)' : 'var(--signal)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          {m.trendUp ? (
                            <path
                              d="M5 15L12 8L19 15"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <path
                              d="M5 9L12 16L19 9"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                        {m.trend}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr',
                  gap: 16,
                  marginBottom: 24,
                }}
                className="charts-row"
              >
                {/* Pie chart */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink-100)',
                      marginBottom: 4,
                    }}
                  >
                    情感分布
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>
                    按情感倾向分类占比
                  </div>
                  <div ref={sentimentRef} style={{ width: '100%', height: 200 }} />
                </div>

                {/* Bar chart */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink-100)',
                      marginBottom: 4,
                    }}
                  >
                    关键词热度 Top10
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>
                    按讨论热度排序
                  </div>
                  <div ref={barRef} style={{ width: '100%', height: 200 }} />
                </div>
              </div>

              {/* Key insights */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink-100)',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z"
                      stroke="var(--signal)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  核心洞察
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      n: 1,
                      text:
                        '品牌 X 本周整体声量环比上升 12.3%，主要来源于新品发布活动引发的讨论，正面情感占比 42.3%，处于健康区间。',
                      sources: 3,
                    },
                    {
                      n: 2,
                      text:
                        '售后服务是当前最主要的负面来源（占负面总量的 38.2%），集中反映在响应速度与解决率上，建议重点关注客服渠道优化。',
                      sources: 5,
                    },
                    {
                      n: 3,
                      text:
                        '用户体验维度讨论热度最高，其中「界面设计」「操作流畅度」两项获赞最多，可作为后续营销传播的核心卖点。',
                      sources: 4,
                    },
                  ].map((insight) => (
                    <div
                      key={insight.n}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--signal)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {insight.n}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: 'var(--ink-200)', lineHeight: 1.6 }}>
                          {insight.text}
                          <sup
                            style={{
                              color: 'var(--cyan)',
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              marginLeft: 2,
                              cursor: 'pointer',
                            }}
                          >
                            [{insight.sources}]
                          </sup>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Template cards */}
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-400)',
              letterSpacing: '0.1em',
              marginBottom: 16,
            }}
          >
            四套行业报告模板
          </div>
          <div
            className="templates-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            {[
              { name: '通用舆情分析', desc: '全维度舆情概览', color: 'var(--cyan)' },
              { name: '品牌声誉分析', desc: '品牌健康度评估', color: 'var(--chartreuse)' },
              { name: '危机公关应对', desc: '快速研判与建议', color: 'var(--signal)' },
              { name: '事件舆情复盘', desc: '全周期回溯分析', color: 'var(--cyan)' },
            ].map((t) => (
              <div
                key={t.name}
                className="card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    background: `${t.color}18`,
                    border: `1px solid ${t.color}33`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="3" width="14" height="18" rx="1.5" stroke={t.color} strokeWidth="1.5" />
                    <path d="M8 8L16 8" stroke={t.color} strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 12L13 12" stroke={t.color} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-100)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
