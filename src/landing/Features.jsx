/* ============================================================
   Features — Core functionality showcase（从 homedemo 1:1 移植）
   ============================================================ */

export default function Features() {
  const features = [
    {
      id: '01',
      title: '三模式输入，零门槛启动',
      desc: '关键词检索、自然语言对话、文本粘贴三种输入方式，无需写爬虫、无需懂 prompt，输入即得专业报告。',
      highlights: ['关键词 1-20 字精准检索', '一句话需求自动解析', '粘贴文本即时分析'],
      color: 'var(--cyan)',
      icon: 'input',
    },
    {
      id: '02',
      title: '十二模型协作，结论更可靠',
      desc: '支持配置最多 12 个 LLM 大模型，并行集成 + ForumEngine 多轮交叉复核 + 本地情感中间件校准，三重保障结论质量。',
      highlights: ['DeepSeek / 智谱 / 通义 / Kimi', '论坛式多模型交叉验证', '本地情感词典校准'],
      color: 'var(--chartreuse)',
      icon: 'models',
    },
    {
      id: '03',
      title: '双轨数据源，真实可信',
      desc: '搜索 API 聚合（博查 + 安思派双源并行）与真实社媒爬虫（7 大平台）双轨采集，叠加实时热搜榜，数据全量可溯源。',
      highlights: ['Bocha + Anspire 双源并行', '微博/小红书/抖音等 7 平台', '实时热搜榜一键分析'],
      color: 'var(--signal)',
      icon: 'source',
    },
    {
      id: '04',
      title: '可视化洞察，一眼掌握全局',
      desc: '情感分布饼图、关键词热度 Top10、本地风险等级评估、情绪走向预测——让数据说话，让决策有据可依。',
      highlights: ['情感分布可视化', '热度词频分析', '风险等级与趋势预测'],
      color: 'var(--cyan)',
      icon: 'viz',
    },
    {
      id: '05',
      title: '四套行业模板，即产即交付',
      desc: '通用舆情、品牌声誉、危机公关、事件复盘四套专业报告模板，流式生成，事实溯源标注，多格式一键导出。',
      highlights: ['HTML / PDF / Markdown', '溯源标注 [n] 到来源', '结构化 IR 渲染'],
      color: 'var(--signal)',
      icon: 'report',
    },
    {
      id: '06',
      title: '全链路可追溯，每步看得见',
      desc: '每一个结论都标注引用来源，每一步智能体产物都可展开查看，从原始数据到最终报告，全程透明可审计。',
      highlights: ['引用标注 → 来源链接', '智能体中间产物可查', '分析记录永久保存'],
      color: 'var(--chartreuse)',
      icon: 'trace',
    },
  ]

  const FeatureIcon = ({ type, color, size = 24 }) => {
    const s = {
      stroke: color,
      strokeWidth: 1.5,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
    switch (type) {
      case 'input':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" {...s} />
            <path d="M7 9L17 9" {...s} />
            <path d="M7 13L13 13" {...s} />
            <path d="M7 17L11 17" {...s} />
            <circle cx="18" cy="15" r="2" {...s} />
          </svg>
        )
      case 'models':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="6" cy="7" r="2.5" {...s} />
            <circle cx="12" cy="5" r="2.5" {...s} />
            <circle cx="18" cy="7" r="2.5" {...s} />
            <circle cx="4" cy="14" r="2.5" {...s} />
            <circle cx="12" cy="13" r="2.5" {...s} />
            <circle cx="20" cy="14" r="2.5" {...s} />
            <circle cx="9" cy="20" r="2.5" {...s} />
            <circle cx="15" cy="20" r="2.5" {...s} />
            <path d="M6 9.5L12 7.5" {...s} strokeDasharray="2 2" />
            <path d="M12 7.5L18 9.5" {...s} strokeDasharray="2 2" />
            <path d="M6 7L4 11.5" {...s} strokeDasharray="2 2" />
            <path d="M18 7L20 11.5" {...s} strokeDasharray="2 2" />
            <path d="M4 16.5L9 17.5" {...s} strokeDasharray="2 2" />
            <path d="M20 16.5L15 17.5" {...s} strokeDasharray="2 2" />
            <path d="M12 15.5L9 17.5" {...s} strokeDasharray="2 2" />
            <path d="M12 15.5L15 17.5" {...s} strokeDasharray="2 2" />
          </svg>
        )
      case 'source':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" {...s} />
            <path d="M3 12L21 12" {...s} />
            <path d="M12 3C14.5 6 15.5 9 12 12C8.5 15 9.5 18 12 21" {...s} />
          </svg>
        )
      case 'viz':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M4 20L20 20" {...s} />
            <path d="M4 20L4 10" {...s} />
            <rect x="7" y="12" width="3" height="8" rx="1" {...s} />
            <rect x="12" y="7" width="3" height="13" rx="1" {...s} />
            <rect x="17" y="10" width="3" height="10" rx="1" {...s} />
          </svg>
        )
      case 'report':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <rect x="5" y="3" width="14" height="18" rx="2" {...s} />
            <path d="M8 8L16 8" {...s} />
            <path d="M8 12L16 12" {...s} />
            <path d="M8 16L13 16" {...s} />
            <circle cx="16" cy="17" r="1.5" {...s} />
          </svg>
        )
      case 'trace':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="2" {...s} />
            <circle cx="18" cy="6" r="2" {...s} />
            <circle cx="6" cy="18" r="2" {...s} />
            <circle cx="18" cy="18" r="2" {...s} />
            <circle cx="12" cy="12" r="2" {...s} />
            <path d="M7.5 7L10.5 10.5" {...s} strokeDasharray="2 2" />
            <path d="M16.5 7L13.5 10.5" {...s} strokeDasharray="2 2" />
            <path d="M7.5 17L10.5 13.5" {...s} strokeDasharray="2 2" />
            <path d="M16.5 17L13.5 13.5" {...s} strokeDasharray="2 2" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <section id="features" className="section">
      <div className="container">
        <div className="section-label">核心功能</div>
        <h2 className="section-heading">
          从「搜一下」到「交付报告」，
          <br />
          只隔一次点击
        </h2>
        <p className="section-subheading">
          专为舆情监测、品牌公关、市场研究与危机应对场景打造的智能舆情工作站，
          让非技术用户也能像专业分析师一样工作。
        </p>

        <div
          className="features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div
              key={f.id}
              className="card feature-card"
              style={{
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* ID number watermark */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 20,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 48,
                  fontWeight: 600,
                  color: 'var(--ink-800)',
                  letterSpacing: '-0.02em',
                  opacity: 0.5,
                  zIndex: 0,
                }}
              >
                {f.id}
              </div>

              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: `${f.color}14`,
                  border: `1px solid ${f.color}33`,
                  display: 'grid',
                  placeItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <FeatureIcon type={f.icon} color={f.color} size={22} />
              </div>

              <h3 style={{ fontSize: 18, position: 'relative', zIndex: 1 }}>
                {f.title}
              </h3>

              <p
                style={{
                  fontSize: 14,
                  color: 'var(--ink-300)',
                  lineHeight: 1.7,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {f.desc}
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  marginTop: 'auto',
                  paddingTop: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {f.highlights.map((h) => (
                  <li
                    key={h}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--ink-200)',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M5 12L10 17L19 7"
                        stroke={f.color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>

              {/* Bottom accent */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${f.color}00, ${f.color}88, ${f.color}00)`,
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
                className="feature-accent"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
