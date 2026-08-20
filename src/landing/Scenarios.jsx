/* ============================================================
   Scenarios — Use case scenarios（从 homedemo 1:1 移植）
   ============================================================ */

export default function Scenarios() {
  const scenarios = [
    {
      id: '01',
      title: '舆情监测',
      desc: '品牌关键词实时监测，自动追踪全网动态，异常波动及时预警，让你始终掌握话语权。',
      tags: ['品牌口碑', '竞品监控', '行业动态'],
      metric: '7×24h',
      metricLabel: '全天候监测',
      color: 'var(--cyan)',
      icon: 'monitor',
    },
    {
      id: '02',
      title: '危机公关',
      desc: '负面事件突发时，一键启动分析，快速研判风险等级、传播路径与核心诉求，为应对决策抢时间。',
      tags: ['风险预警', '传播溯源', '应对建议'],
      metric: '3min',
      metricLabel: '快速研判',
      color: 'var(--signal)',
      icon: 'alert',
    },
    {
      id: '03',
      title: '品牌声誉',
      desc: '定期评估品牌健康度，从情感倾向、核心话题到渠道分布，全方位诊断品牌声誉状况。',
      tags: ['健康度评分', '竞品对标', '趋势跟踪'],
      metric: '360°',
      metricLabel: '全维度评估',
      color: 'var(--chartreuse)',
      icon: 'health',
    },
    {
      id: '04',
      title: '事件复盘',
      desc: '舆情事件结束后，完整回溯事件全生命周期，沉淀经验教训，为下一次应对积累知识资产。',
      tags: ['时间线还原', '成因分析', '经验沉淀'],
      metric: 'IR化',
      metricLabel: '结构化复盘',
      color: 'var(--cyan)',
      icon: 'timeline',
    },
  ]

  const ScenarioIcon = ({ type, color, size = 28 }) => {
    const s = {
      stroke: color,
      strokeWidth: 1.5,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
    switch (type) {
      case 'monitor':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="12" rx="2" {...s} />
            <path d="M8 20L16 20" {...s} />
            <path d="M12 16L12 20" {...s} />
            <path d="M6 8L9 8" {...s} />
            <path d="M6 11L14 11" {...s} />
            <path d="M6 14L11 14" {...s} />
          </svg>
        )
      case 'alert':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M12 3L4 8V16L12 21L20 16V8L12 3Z" {...s} />
            <path d="M12 9L12 13" {...s} />
            <circle cx="12" cy="16" r="1" {...s} />
          </svg>
        )
      case 'health':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M20.8 4.6C18.8 2.8 15.9 2.7 13.8 4.3L12 5.7L10.2 4.3C8.1 2.7 5.2 2.8 3.2 4.6C0.9 6.8 0.7 10.3 2.6 12.7L12 22L21.4 12.7C23.3 10.3 23.1 6.8 20.8 4.6Z" {...s} />
            <path d="M9 12L11 14L15 10" {...s} strokeWidth="1.8" />
          </svg>
        )
      case 'timeline':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="2" {...s} />
            <circle cx="6" cy="12" r="2" {...s} />
            <circle cx="6" cy="18" r="2" {...s} />
            <path d="M8 6L20 6" {...s} />
            <path d="M8 12L16 12" {...s} />
            <path d="M8 18L18 18" {...s} />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <section id="scenarios" className="section">
      <div className="container">
        <div className="section-label">典型场景</div>
        <h2 className="section-heading">
          四个场景，一套方案
          <br />
          覆盖舆情工作全链路
        </h2>
        <p className="section-subheading">
          无论是日常监测、危机应对还是长期声誉管理，AgentMind 都能帮你
          从「搜一下」到「拿出专业结论」，快一个数量级。
        </p>

        <div
          className="scenarios-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}
        >
          {scenarios.map((s) => (
            <div
              key={s.id}
              className="card scenario-card"
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top area: icon + metric */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-sm)',
                    background: `${s.color}14`,
                    border: `1px solid ${s.color}33`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <ScenarioIcon type={s.icon} color={s.color} size={22} />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 800,
                      color: s.color,
                      lineHeight: 1,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {s.metric}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-400)',
                      marginTop: 2,
                    }}
                  >
                    {s.metricLabel}
                  </div>
                </div>
              </div>

              {/* Number */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: s.color,
                  letterSpacing: '0.15em',
                }}
              >
                SCENARIO {s.id}
              </div>

              <h3 style={{ fontSize: 18 }}>{s.title}</h3>

              <p
                style={{
                  fontSize: 13.5,
                  color: 'var(--ink-300)',
                  lineHeight: 1.7,
                  flex: 1,
                }}
              >
                {s.desc}
              </p>

              {/* Tags */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border)',
                }}
              >
                {s.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: '3px 9px',
                      fontSize: 11,
                      color: 'var(--ink-300)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Decorative corner */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 80,
                  height: 80,
                  background: `radial-gradient(circle at 100% 0%, ${s.color}18, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
