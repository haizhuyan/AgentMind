/* ============================================================
   Footer（从 homedemo 1:1 移植）
   ============================================================ */

export default function Footer() {
  const columns = [
    {
      title: '产品',
      links: ['核心功能', '智能体流水线', '使用场景', '报告模板', '更新日志'],
    },
    {
      title: '资源',
      links: ['使用文档', '部署指南', 'API 文档', '常见问题', '离线演示'],
    },
    {
      title: '技术',
      links: ['技术架构', '数据源接入', '模型配置', '开源地址', '问题反馈'],
    },
  ]

  return (
    <footer
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '56px 0 32px',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 2fr',
            gap: 48,
            marginBottom: 40,
          }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="6" cy="12" r="3" stroke="var(--cyan)" strokeWidth="1.5" />
                  <circle cx="18" cy="12" r="3" stroke="var(--cyan)" strokeWidth="1.5" />
                  <circle cx="12" cy="6" r="3" stroke="var(--signal)" strokeWidth="1.5" />
                  <circle cx="12" cy="18" r="3" stroke="var(--signal)" strokeWidth="1.5" />
                  <path d="M9 12L15 12" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2" />
                  <path d="M12 9L12 15" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--ink-50)',
                  }}
                >
                  AgentMind
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--ink-400)',
                    letterSpacing: '0.08em',
                  }}
                >
                  MULTI-AGENT OSINT
                </span>
              </div>
            </a>
            <p style={{ fontSize: 13, color: 'var(--ink-400)', lineHeight: 1.7, maxWidth: 320 }}>
              面向舆情监测、品牌公关、市场研究与危机应对场景的 AI 多智能体舆情分析系统。
              让每一个人都能像专业分析师一样工作。
            </p>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 20,
              }}
            >
              {['GitHub', 'Discord', 'Email'].map((social) => (
                <a
                  key={social}
                  href="#"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink-300)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cyan)'
                    e.currentTarget.style.color = 'var(--cyan)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--ink-300)'
                  }}
                >
                  {social.slice(0, 2)}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
            }}
            className="footer-links"
          >
            {columns.map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--ink-200)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  {col.title}
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-400)',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--cyan)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--ink-400)'
                        }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 24,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            © 2026 AgentMind. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
              隐私政策
            </a>
            <a href="#" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
              使用条款
            </a>
            <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
