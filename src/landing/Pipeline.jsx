/* ============================================================
   Pipeline — Detailed 6-agent workflow section（从 homedemo 1:1 移植）
   ============================================================ */

export default function Pipeline() {
  const agents = [
    {
      id: '01',
      name: '采集 Agent',
      en: 'COLLECT',
      desc: '多源并发获取舆情原始文本与来源信息，支持搜索 API、真实爬虫、热搜榜三类数据源并行采集。',
      output: '来源链接、原始样本列表、平台分布统计',
      color: 'var(--cyan)',
      icon: 'search',
    },
    {
      id: '02',
      name: '清洗 Agent',
      en: 'CLEAN',
      desc: '智能去重、去广告、去无效短句，统一文本格式，确保分析数据的质量与准确性。',
      output: '清洗前后条数对比、清洗后样本库、无效内容过滤日志',
      color: 'var(--cyan)',
      icon: 'filter',
    },
    {
      id: '03',
      name: '分析 Agent',
      en: 'ANALYZE',
      desc: '情感分析、关键词提取、观点聚类、话题识别，多维度拆解舆情结构。',
      output: '情感占比分布、热度 Top10、核心观点摘要、话题聚类',
      color: 'var(--chartreuse)',
      icon: 'chart',
    },
    {
      id: '04',
      name: '洞察 Agent',
      en: 'INSIGHT',
      desc: '趋势研判、风险识别、核心诉求挖掘、事件成因推演，从数据中发现关键信号。',
      output: '风险等级评估、核心诉求清单、事件成因链、趋势预测',
      color: 'var(--signal)',
      icon: 'radar',
    },
    {
      id: '05',
      name: '论坛协作 Agent',
      en: 'FORUM',
      desc: '多模型多轮交叉验证，模拟专家论坛式讨论，收敛共识、识别分歧，确保结论稳健可靠。',
      output: '逐轮发言记录、共识/分歧点、交叉验证溯源信息',
      color: 'var(--signal)',
      icon: 'forum',
    },
    {
      id: '06',
      name: '报告 Agent',
      en: 'REPORT',
      desc: '按照行业模板整合所有分析结果，流式生成结构化报告，支持多格式一键导出。',
      output: '完整舆情报告、溯源标注 [n]、HTML/PDF/Markdown 多格式',
      color: 'var(--signal)',
      icon: 'doc',
    },
  ]

  const AgentIcon = ({ type, color, size = 28 }) => {
    const s = {
      stroke: color,
      strokeWidth: 1.5,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
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
    <section id="pipeline" className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div className="section-label">智能体流水线</div>
        <h2 className="section-heading">
          六个 AI 智能体，
          <br />
          一条流水线全自动闭环
        </h2>
        <p className="section-subheading">
          从数据采集到报告生成，六名专业「AI 分析师」按流水线依次协作。
          每一步运行状态实时可见，每一个中间产物都可以展开查看。
        </p>

        <div
          className="pipeline-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {agents.map((agent, idx) => (
            <div
              key={agent.id}
              className="pipeline-card card accent-line"
              style={{
                padding: '24px 24px 24px 28px',
                display: 'flex',
                gap: 20,
                position: 'relative',
              }}
            >
              {/* Step number + icon */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-md)',
                    background: `${agent.color}14`,
                    border: `1px solid ${agent.color}33`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <AgentIcon type={agent.icon} color={agent.color} size={24} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {agent.en}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: agent.color,
                      fontWeight: 500,
                    }}
                  >
                    Step {agent.id}
                  </span>
                  <h3 style={{ fontSize: 17 }}>{agent.name}</h3>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-300)', lineHeight: 1.7 }}>
                  {agent.desc}
                </p>
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 8,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    <path
                      d="M5 12L10 17L19 7"
                      stroke={agent.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--ink-500)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 2,
                      }}
                    >
                      输出产物
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-200)', lineHeight: 1.5 }}>
                      {agent.output}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector arrow (right side for left column) */}
              {idx % 2 === 0 && idx < agents.length - 1 && (
                <div
                  className="connector-right"
                  style={{
                    position: 'absolute',
                    right: -18,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12L19 12"
                      stroke="var(--ink-500)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <path
                      d="M13 6L19 12L13 18"
                      stroke="var(--ink-500)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            background: 'var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
          className="stats-row"
        >
          {[
            { num: '6', label: 'AI 智能体', sub: '流水线协作' },
            { num: '12', label: 'LLM 模型', sub: '并行交叉验证' },
            { num: '7+', label: '社媒平台', sub: '真实数据采集' },
            { num: '4', label: '报告模板', sub: '多格式导出' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--surface-2)',
                padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 40,
                  fontWeight: 900,
                  color: 'var(--ink-50)',
                  lineHeight: 1,
                  marginBottom: 6,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--ink-200)',
                  marginBottom: 2,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
