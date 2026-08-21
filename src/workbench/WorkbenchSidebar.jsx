/**
 * WorkbenchSidebar —— 工作台左侧栏（从 homedemo workbench.html 1:1 还原）
 * logo + 新建分析 + 分组历史记录 + 离线演示开关 + 登录状态
 */
export default function WorkbenchSidebar({
  user,
  demoMode,
  loading,
  records = [],
  history = [],
  activeRecordId,
  onNewChat,
  onOpenRecord,
  onDeleteRecord,
  onPickHistory,
  onRemoveHistory,
  onClearHistory,
  onToggleDemo,
  onLoginStatusClick,
  onHome,
  onLogout
}) {
  // 服务端记录按日期分组：今天 / 昨天 / 更早
  const groups = groupRecordsByDate(records)
  const hasRecords = records.length > 0

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-logo"
          onClick={onHome}
          title="返回首页"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
        >
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="12" r="3" stroke="var(--cyan)" strokeWidth="1.5"/>
              <circle cx="18" cy="12" r="3" stroke="var(--cyan)" strokeWidth="1.5"/>
              <circle cx="12" cy="6" r="3" stroke="var(--signal)" strokeWidth="1.5"/>
              <circle cx="12" cy="18" r="3" stroke="var(--signal)" strokeWidth="1.5"/>
              <path d="M9 12L15 12" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2"/>
              <path d="M12 9L12 15" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <span className="name">AgentMind</span>
            <span className="sub">MULTI-AGENT OSINT</span>
          </div>
        </button>
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          新建分析
        </button>
      </div>

      {/* History */}
      <div className="sidebar-history">
        <div className="history-label">历史记录</div>

        {user ? (
          hasRecords ? (
            groups.map((g) => (
              <div className="history-group" key={g.label}>
                <div className="history-date">{g.label}</div>
                {g.items.map((r) => (
                  <button
                    key={r.id}
                    className={`history-item ${activeRecordId === r.id ? 'active' : ''}`}
                    onClick={() => onOpenRecord(r.id)}
                    disabled={loading}
                    title={r.status === 'completed' ? '点击回看完整内容' : '点击查看；未完成需手动继续分析'}
                  >
                    <svg className="history-icon" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="history-text">
                      <div className="history-title">{r.keyword}</div>
                      <div className="history-meta">
                        {recordMeta(r)}
                      </div>
                    </div>
                    <span
                      className="history-del"
                      role="button"
                      tabIndex={-1}
                      title="删除该记录"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteRecord?.(r.id)
                      }}
                    >
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            ))
          ) : (
            // 登录用户无服务端记录：显示空态，不混入本地演示历史
            <div className="history-item" style={{ cursor: 'default' }}>
              <div className="history-text">
                <div className="history-title" style={{ color: 'var(--ink-500)' }}>暂无分析记录</div>
              </div>
            </div>
          )
        ) : demoMode ? (
          <div className="history-group">
            <div className="history-date">本地演示记录</div>
            {history.length === 0 && (
              <div className="history-item" style={{ cursor: 'default' }}>
                <div className="history-text">
                  <div className="history-title" style={{ color: 'var(--ink-500)' }}>暂无记录</div>
                </div>
              </div>
            )}
            {history.map((h) => (
              <button
                key={h.keyword}
                className="history-item"
                onClick={() => onPickHistory?.(h.keyword)}
                disabled={loading}
                title="点击重新分析"
              >
                <svg className="history-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="history-text">
                  <div className="history-title">{h.keyword}</div>
                  <div className="history-meta">{formatTime(h.ts)}</div>
                </div>
                <span
                  className="history-del"
                  role="button"
                  tabIndex={-1}
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveHistory?.(h.keyword)
                  }}
                >
                  ✕
                </span>
              </button>
            ))}
            {history.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span
                  style={{ fontSize: 10.5, color: 'var(--ink-500)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                  onClick={onClearHistory}
                  role="button"
                >
                  清空
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="history-item" style={{ cursor: 'default' }}>
            <div className="history-text">
              <div className="history-title" style={{ color: 'var(--ink-500)' }}>暂无记录</div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="toggle-row">
          <div className="toggle-label">
            <span className="dot"></span>
            离线演示模式
          </div>
          <button
            type="button"
            className={`toggle-switch ${demoMode ? '' : 'off'}`}
            onClick={() => onToggleDemo?.(!demoMode)}
            disabled={loading}
            title={demoMode ? '关闭离线演示' : '开启离线演示'}
          />
        </div>
        <div className="login-status" style={{ cursor: 'default' }}>
          <div className="avatar">{user ? user.username.slice(0, 1).toUpperCase() : '🧪'}</div>
          <div className="login-info">
            <div className="login-name">{user ? user.username : '离线演示'}</div>
            <div className="login-plan">{user ? 'PRO 用户' : 'OFFLINE · 演示模式'}</div>
          </div>
          {user ? (
            <button
              type="button"
              className="logout-btn"
              onClick={onLogout}
              title="退出登录，返回首页"
            >
              退出登录
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={onLoginStatusClick} title="登录">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

/** 记录列表元信息：模板 · 样本数 · 状态 */
function recordMeta(r) {
  const parts = []
  if (r.template_name) parts.push(r.template_name)
  else parts.push(r.source === 'mindspider' ? '爬虫' : '搜索')
  if (r.sample_count != null) parts.push(`${r.sample_count}条样本`)
  parts.push(r.status === 'running' ? '进行中' : r.status === 'failed' ? '失败' : '已完成')
  return parts.join(' · ')
}

function groupRecordsByDate(records) {
  const groups = []
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  for (const r of records) {
    const ts = Number(r.created_at) * 1000
    let label = '本周早些时候'
    if (ts >= dayStart) label = '今天'
    else if (ts >= dayStart - 86400000) label = '昨天'
    let g = groups.find((x) => x.label === label)
    if (!g) {
      g = { label, items: [] }
      groups.push(g)
    }
    g.items.push(r)
  }
  return groups
}

function formatTime(ts) {
  const d = new Date(Number(ts))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= dayStart) return `今天 ${hm}`
  if (d.getTime() >= dayStart - 86400000) return `昨天 ${hm}`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}
