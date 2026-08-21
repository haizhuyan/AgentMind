/* ============================================================
   CTA — Final call-to-action section（从 homedemo 1:1 移植）
   ============================================================ */

export default function CTA({ onFreeTrial }) {
  return (
    <section id="cta" className="section" style={{ paddingBottom: 80 }}>
      <div className="container">
        <div
          className="cta-card"
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-xl)',
            padding: '64px 48px',
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.06) 100%)',
            border: '1px solid var(--border-strong)',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 700,
              height: 700,
              background:
                'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30%',
              right: '-10%',
              width: 400,
              height: 400,
              background:
                'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              pointerEvents: 'none',
            }}
          />

          {/* Top badge */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 999,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--signal)',
                letterSpacing: '0.1em',
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--signal)',
                  boxShadow: '0 0 6px var(--signal-glow)',
                }}
              />
              立即开始
            </div>

            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', marginBottom: 16 }}>
              打破信息茧房，
              <br />
              <span className="gradient-text">还原真实舆情原貌</span>
            </h2>
            <p
              style={{
                fontSize: 17,
                color: 'var(--ink-300)',
                maxWidth: 600,
                margin: '0 auto 32px',
                lineHeight: 1.7,
              }}
            >
              支持离线演示模式 —— 无需网络、无需密钥、无需后端，
              一键开启本地预置数据完整演示，全流程跑通只需 3 分钟。
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: 32,
              }}
            >
              <a
                href="#"
                className="btn btn-primary btn-lg"
                onClick={(e) => {
                  e.preventDefault()
                  onFreeTrial?.()
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                立即免费体验
              </a>
              <a href="https://github.com/haizhuyan/AgentMind" className="btn btn-secondary btn-lg" target="_blank">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 12L12 17L17 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 21L19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                查看部署文档
              </a>
            </div>

            {/* Features list */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                flexWrap: 'wrap',
              }}
              className="cta-features"
            >
              {[
                '免费注册即用',
                '离线演示模式',
                '12 个模型支持',
                '多格式报告导出',
                '数据本地存储',
              ].map((f) => (
                <div
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--ink-300)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12L10 17L19 7"
                      stroke="var(--cyan)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
