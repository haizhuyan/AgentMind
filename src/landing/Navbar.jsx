/* ============================================================
   Navbar — Top navigation（从 homedemo 1:1 移植）
   ============================================================ */

import { useState, useEffect } from 'react'

export default function Navbar({ user, onLoginClick, onDemo, onEnterWorkspace }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { label: '核心功能', href: '#features' },
    { label: '智能体流水线', href: '#pipeline' },
    { label: '使用场景', href: '#scenarios' },
    { label: '报告预览', href: '#report' },
    { label: '快速开始', href: '#cta' },
  ]

  return (
    <nav
      className="navbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: scrolled ? 'blur(12px)' : 'blur(6px)',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'blur(6px)',
        background: scrolled
          ? 'rgba(255, 255, 255, 0.85)'
          : 'rgba(255, 255, 255, 0.6)',
        borderBottom: scrolled
          ? '1px solid var(--border)'
          : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          {/* Logo */}
          <a href="#" className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="logo-mark"
              style={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                position: 'relative',
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
                  letterSpacing: '-0.01em',
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

          {/* Desktop nav */}
          <div
            className="nav-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--ink-200)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink-50)'
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--ink-200)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div
            className="nav-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {user ? (
              <>
                {/* 登录状态 */}
                <a
                  href="#"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  onClick={(e) => {
                    e.preventDefault()
                    onEnterWorkspace?.()
                  }}
                  title="进入工作台"
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--signal), var(--cyan))',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                  {user.username}
                </a>
                <a
                  href="#cta"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.preventDefault()
                    onEnterWorkspace?.()
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  进入工作台
                </a>
              </>
            ) : (
              <>
                <a
                  href="#"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.preventDefault()
                    onLoginClick?.()
                  }}
                >
                  登录
                </a>
                <a
                  href="#cta"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.preventDefault()
                    onDemo?.()
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  离线演示
                </a>
              </>
            )}

            {/* Mobile toggle */}
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--ink-200)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 7L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 17L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: '12px 20px 20px',
          }}
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                fontSize: 15,
                color: 'var(--ink-200)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#cta"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 16 }}
            onClick={(e) => {
              e.preventDefault()
              setMobileOpen(false)
              onDemo?.()
            }}
          >
            离线演示
          </a>
        </div>
      )}
    </nav>
  )
}
