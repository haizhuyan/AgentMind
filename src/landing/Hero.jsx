/* ============================================================
   Hero — Landing page hero with 6-agent pipeline animation
   Signature element of the page（从 homedemo 1:1 移植）
   ============================================================ */

import { useState, useEffect } from 'react'

export default function Hero({ onStartAnalyze }) {
  const agents = [
    { id: 1, name: '采集', en: 'Collect', desc: '多源聚合原始文本', color: 'var(--cyan)', icon: 'search' },
    { id: 2, name: '清洗', en: 'Clean', desc: '去重去噪结构化', color: 'var(--cyan)', icon: 'filter' },
    { id: 3, name: '分析', en: 'Analyze', desc: '情感观点提取', color: 'var(--chartreuse)', icon: 'chart' },
    { id: 4, name: '洞察', en: 'Insight', desc: '趋势风险研判', color: 'var(--signal)', icon: 'radar' },
    { id: 5, name: '论坛协作', en: 'Forum', desc: '多模型交叉验证', color: 'var(--signal)', icon: 'forum' },
    { id: 6, name: '报告', en: 'Report', desc: '结构化报告产出', color: 'var(--signal)', icon: 'doc' },
  ]

  const [activeStep, setActiveStep] = useState(0)
  const [inputValue, setInputValue] = useState('')

  // Animated typing effect for input
  const sampleQueries = [
    '品牌 X 近期网络口碑如何？',
    '事件 Y 的舆情走向与风险研判',
    '竞品 Z 的用户评价对比分析',
  ]
  const [queryIdx, setQueryIdx] = useState(0)
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    const fullText = sampleQueries[queryIdx]
    let charIdx = 0
    let typing = true
    let pauseTimer = null

    const tick = () => {
      if (typing) {
        charIdx++
        setDisplayText(fullText.slice(0, charIdx))
        if (charIdx >= fullText.length) {
          typing = false
          pauseTimer = setTimeout(() => {
            typing = false
            tick()
          }, 2500)
          return
        }
        setTimeout(tick, 80)
      } else {
        charIdx--
        setDisplayText(fullText.slice(0, charIdx))
        if (charIdx <= 0) {
          typing = true
          setQueryIdx((i) => (i + 1) % sampleQueries.length)
          return
        }
        setTimeout(tick, 30)
      }
    }

    const timer = setTimeout(tick, 500)
    return () => {
      clearTimeout(timer)
      clearTimeout(pauseTimer)
    }
  }, [queryIdx])

  // Agent pipeline animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (agents.length + 1))
    }, 1600)
    return () => clearInterval(interval)
  }, [agents.length])

  const AgentIcon = ({ type, color, size = 20 }) => {
    const s = { stroke: color, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
    switch (type) {
      case 'search':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" {...s} />
            <path d="M20 20L16.65 16.65" {...s} />
          </svg>
        )
      case 'filter':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M4 5L20 5" {...s} />
            <path d="M7 12L17 12" {...s} />
            <path d="M10 19L14 19" {...s} />
            <path d="M7 5V7" {...s} />
            <path d="M17 5V7" {...s} />
            <path d="M10 12V14" {...s} />
            <path d="M14 12V14" {...s} />
          </svg>
        )
      case 'chart':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M4 20L20 20" {...s} />
            <path d="M7 20V12" {...s} />
            <path d="M12 20V6" {...s} />
            <path d="M17 20V9" {...s} />
          </svg>
        )
      case 'radar':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" {...s} />
            <path d="M12 4L12 12L18.9 16" {...s} />
            <circle cx="12" cy="12" r="2" {...s} />
          </svg>
        )
      case 'forum':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="7" cy="10" r="3" {...s} />
            <circle cx="17" cy="10" r="3" {...s} />
            <path d="M4 19C4 16.79 5.79 15 8 15L16 15C18.21 15 20 16.79 20 19" {...s} />
          </svg>
        )
      case 'doc':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <rect x="6" y="3" width="12" height="18" rx="1.5" {...s} />
            <path d="M9 8L15 8" {...s} />
            <path d="M9 12L15 12" {...s} />
            <path d="M9 16L13 16" {...s} />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <section
      className="hero"
      style={{
        paddingTop: 140,
        paddingBottom: 80,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div
        className="hero-bg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 900,
            height: 600,
            background:
              'radial-gradient(ellipse, rgba(37,99,235,0.10) 0%, rgba(14,165,233,0.06) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Scanline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.3), transparent)',
          }}
        />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top badge row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <div
            className="badge badge-signal"
            style={{
              padding: '6px 14px',
              fontSize: 12,
            }}
          >
            <span
              className="blink-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--signal)',
                boxShadow: '0 0 6px var(--signal-glow)',
              }}
            />
            v1.0 正式发布
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', maxWidth: 960, margin: '0 auto 40px' }}>
          <h1 style={{ marginBottom: 20 }}>
            人人可用的<span className="gradient-text"> 多Agent舆情分析助手</span>
            <br className="hero-br" />
            打破信息茧房，还原舆情原貌
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 1.8vw, 19px)',
              color: 'var(--ink-300)',
              maxWidth: 720,
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            一句话需求 → 采集 · 清洗 · 分析 · 洞察 · 论坛协作 · 报告，全自动闭环。
            <br className="hero-br" />
            六个 AI 智能体依次协作，产出带情感图表、风险研判与来源溯源的完整舆情报告——
            <br className="hero-br" />
            支持交互式 HTML / PDF / Markdown 一键导出，可直接作为交付报告。
          </p>
        </div>

        {/* Input box — the command center entry */}
        <div
          className="hero-input-wrap"
          style={{
            maxWidth: 720,
            margin: '0 auto 56px',
          }}
        >
          <div
            className="input-frame"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '6px 6px 6px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow:
                '0 8px 32px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(37, 99, 235, 0.15) inset',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--signal)',
                  boxShadow: '0 0 8px var(--signal-glow)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-400)',
                  letterSpacing: '0.1em',
                }}
              >
                PROMPT
              </span>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: 'var(--ink-50)',
                  fontFamily: 'var(--font-body)',
                  padding: '14px 0',
                }}
              />
              {!inputValue && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    fontSize: 15,
                    color: 'var(--ink-400)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span>{displayText}</span>
                  <span
                    className="cursor-blink"
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 16,
                      background: 'var(--signal)',
                      marginLeft: 2,
                      verticalAlign: 'middle',
                    }}
                  />
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '12px 20px', fontSize: 14 }}
              onClick={() => onStartAnalyze?.(inputValue)}
            >
              开始分析
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Input mode tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              marginTop: 12,
            }}
          >
            {[
              { label: '关键词', hint: '1-20字' },
              { label: '自然语言', hint: '报告后追问' },
              { label: '文本上传', hint: '上传文件' },
            ].map((mode, i) => (
              <div
                key={mode.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: i === 0 ? 'var(--surface-2)' : 'transparent',
                  border: i === 0 ? '1px solid var(--border-strong)' : '1px solid transparent',
                  fontSize: 12,
                  color: i === 0 ? 'var(--ink-100)' : 'var(--ink-400)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>0{i + 1}</span>
                {mode.label}
                <span style={{ color: 'var(--ink-500)', fontSize: 11 }}>{mode.hint}</span>
              </div>
            ))}
          </div>
        </div>

        {/* === 6-Agent Pipeline — Signature Element === */}
        <div
          className="pipeline-section"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-400)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              SIX-AGENT PIPELINE
            </span>
            <div style={{ width: 32, height: 1, background: 'var(--border-strong)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--cyan)',
                letterSpacing: '0.1em',
              }}
            >
              LIVE · 实时运行
            </span>
          </div>

          <div className="pipeline-track-wrap" style={{ position: 'relative' }}>
            {/* The flow track */}
            <div
              className="pipeline-track"
              style={{
                position: 'absolute',
                top: 42,
                left: 40,
                right: 40,
                height: 2,
                background: 'var(--border)',
                zIndex: 0,
              }}
            >
              {/* Progress fill */}
              <div
                className="pipeline-progress"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${(activeStep / agents.length) * 100}%`,
                  background:
                    'linear-gradient(90deg, var(--cyan), var(--signal))',
                  boxShadow: '0 0 8px var(--cyan-glow)',
                  transition: 'width 0.5s ease',
                }}
              />
              {/* Data packets */}
              {[0, 1, 2].map((p) => (
                <div
                  key={p}
                  className="data-packet"
                  style={{
                    position: 'absolute',
                    top: -3,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--signal)',
                    boxShadow: '0 0 10px var(--signal-glow)',
                    animation: `packet-flow ${3 + p * 0.8}s linear infinite`,
                    animationDelay: `${p * -1}s`,
                  }}
                />
              ))}
            </div>

            {/* Agent nodes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {agents.map((agent, idx) => {
                const isActive = activeStep === idx
                const isDone = activeStep > idx
                const nodeColor = isActive ? agent.color : isDone ? 'var(--cyan)' : 'var(--ink-500)'

                return (
                  <div
                    key={agent.id}
                    className="agent-node"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.3s ease',
                      transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                      background:'white',
                    }}
                  >
                    {/* Node circle */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: isActive
                          ? `radial-gradient(circle, ${agent.color}22, var(--surface))`
                          : 'var(--surface)',
                        border: `2px solid ${
                          isActive
                            ? agent.color
                            : isDone
                            ? 'var(--cyan)'
                            : 'var(--border-strong)'
                        }`,
                        boxShadow: isActive
                          ? `0 0 20px ${agent.color}55, inset 0 0 12px ${agent.color}22`
                          : isDone
                          ? '0 0 12px var(--cyan-glow)'
                          : 'none',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <AgentIcon type={agent.icon} color={nodeColor} size={22} />

                      {/* Status dot */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'var(--surface)',
                          border: '2px solid var(--surface)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {isDone ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 12L10 17L19 7"
                              stroke="var(--cyan)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : isActive ? (
                          <div
                            className="spinner"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              border: `2px solid ${agent.color}44`,
                              borderTopColor: agent.color,
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'var(--ink-600)',
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Agent label */}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 14,
                          fontWeight: 600,
                          color: isActive || isDone ? 'var(--ink-50)' : 'var(--ink-400)',
                          marginBottom: 2,
                          transition: 'color 0.3s ease',
                        }}
                      >
                        {agent.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--ink-500)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Agent 0{agent.id}
                      </div>
                    </div>

                    {/* Description */}
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-400)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                        maxWidth: 100,
                      }}
                    >
                      {agent.desc}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pipeline status bar */}
          <div
            style={{
              marginTop: 32,
              padding: '12px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-400)',
                }}
              >
                当前阶段
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--signal)',
                    boxShadow: '0 0 6px var(--signal-glow)',
                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ink-100)',
                  }}
                >
                  {agents[activeStep % agents.length]?.name || '采集'} Agent 运行中
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    letterSpacing: '0.05em',
                  }}
                >
                  已处理样本
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--cyan)',
                  }}
                >
                  2,847
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    letterSpacing: '0.05em',
                  }}
                >
                  预计剩余
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--signal)',
                  }}
                >
                  18s
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div
          style={{
            marginTop: 64,
            paddingTop: 32,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 32,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.1em' }}>
            数据接入
          </span>
          {[
            'Bocha 博查',
            'Anspire 安思派',
            '微博',
            '小红书',
            '抖音',
            '知乎',
            'B站',
          ].map((name) => (
            <span
              key={name}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink-400)',
                opacity: 0.7,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
