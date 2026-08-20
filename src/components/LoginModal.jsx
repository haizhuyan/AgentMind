import { useState } from 'react'
import { apiRegister, apiLogin, setToken } from '../services/api.js'

/**
 * LoginModal —— 弹窗式登录/注册
 * ---------------------------------------------------
 * 从落地页「登录 / 开始分析 / 立即免费体验」入口弹出。
 * - 登录成功 → onSuccess(user)（进入工作台）
 * - 关闭（右上角 ✕ / 点击遮罩）→ onClose()（留在原地）
 * - 「暂不登录，先离线体验」→ onDemo()（进入离线演示工作台）
 */
export default function LoginModal({ onSuccess, onClose, onDemo }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (loading) return
    const name = username.trim()
    if (!name) return setError('请输入用户名')
    if (password.length < 6) return setError('密码至少 6 位')
    setError('')
    setLoading(true)
    try {
      const data = tab === 'login' ? await apiLogin(name, password) : await apiRegister(name, password)
      setToken(data.token)
      onSuccess?.(data.user)
    } catch (err) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-modal-close" onClick={onClose} title="关闭并进入离线演示">
          ✕
        </button>

        <div className="login-modal-head">
          <span className="login-modal-dot" />
          AgentMind 账号
        </div>

        <div className="login-modal-tabs">
          <button
            type="button"
            className={`login-modal-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError('') }}
          >
            登录
          </button>
          <button
            type="button"
            className={`login-modal-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}
          >
            注册
          </button>
        </div>

        <form
          className="login-modal-form"
          onSubmit={(e) => { e.preventDefault(); submit() }}
        >
          <label className="login-modal-field">
            <span>用户名</span>
            <input
              type="text"
              value={username}
              placeholder="2-20 位字母/数字/中文"
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="login-modal-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              placeholder="至少 6 位"
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <p className="login-modal-error">⚠ {error}</p>}
          <button type="submit" className="login-modal-submit" disabled={loading}>
            {loading ? '请稍候…' : tab === 'login' ? '登录' : '创建账号'}
          </button>
        </form>

        <button type="button" className="login-modal-demo" onClick={onDemo}>
          暂不登录，先离线体验 →
        </button>
      </div>
    </div>
  )
}
