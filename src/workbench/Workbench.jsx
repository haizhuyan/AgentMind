import { useState, useEffect, useCallback } from 'react'
import WorkbenchSidebar from './WorkbenchSidebar.jsx'
import WorkbenchMessages from './WorkbenchMessages.jsx'
import WorkbenchInput from './WorkbenchInput.jsx'
import { fetchHotList } from '../services/hotlistService.js'
import { buildHtmlReport } from '../utils/htmlReport.js'
import './workbench.css'

/**
 * Workbench —— 舆情分析工作台（从 homedemo workbench.html 1:1 还原 + 功能对接）
 * 左：logo/新建分析/分组历史/演示开关/登录态
 * 右：顶栏（标题+状态+操作）→ 横向热搜榜（工作时隐藏）→ 对话消息流 → 底部输入区
 */
export default function Workbench({
  user,
  demoMode,
  loading,
  statuses,
  result,
  viewRecord,
  streamReport,
  thinking,
  error,
  activeKeyword,
  records,
  history,
  models,
  primaryId,
  onSetPrimary,
  templateId,
  onSelectTemplate,
  collectSource,
  collectPlatform,
  onSourceChange,
  onPlatformChange,
  seedKeyword,
  onNewChat,
  onOpenRecord,
  onDeleteRecord,
  onPickKeyword,
  onRemoveHistory,
  onClearHistory,
  onToggleDemo,
  onLoginStatusClick,
      onAnalyze,
  onHome,
  onLogout,
  notice,
  onDismissNotice,
  activeRecordId
}) {
  const [hotList, setHotList] = useState([])
  const [hotError, setHotError] = useState('')
  const [hotLoading, setHotLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(0)
  const [now, setNow] = useState(Date.now())

  const loadHot = useCallback(async () => {
    setHotLoading(true)
    setHotError('')
    try {
      const data = await fetchHotList()
      setHotList(data)
      setLastUpdated(Date.now())
    } catch (err) {
      setHotError(err.message || '热搜榜获取失败')
    } finally {
      setHotLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHot()
  }, [loadHot, demoMode]) // 演示模式切换时重新拉取对应数据源

  // 刷新时间戳显示
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const data = viewRecord?.result || result
  const title = viewRecord?.keyword || result?.keyword || activeKeyword || '新建分析'
  const updatedAgo = lastUpdated ? Math.max(1, Math.round((now - lastUpdated) / 60000)) : 0

  // 顶栏操作：分享（复制）/ 导出（HTML）/ 更多
  async function handleShare() {
    if (!data?.report) return
    try {
      await navigator.clipboard.writeText(data.report)
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  }

  function handleExportHtml() {
    if (!data) return
    const html = buildHtmlReport(data)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const kw = (data.keyword || 'report').replace(/[\\/:*?"<>|]/g, '_')
    a.href = url
    a.download = `舆情报告_${kw}_${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="workbench">
      {/* ===== 左侧栏 ===== */}
      <WorkbenchSidebar
        user={user}
        demoMode={demoMode}
        loading={loading}
        records={records}
        history={history}
        activeRecordId={viewRecord?.id || activeRecordId}
        onNewChat={onNewChat}
        onOpenRecord={onOpenRecord}
        onDeleteRecord={onDeleteRecord}
        onPickHistory={onPickKeyword}
        onRemoveHistory={onRemoveHistory}
        onClearHistory={onClearHistory}
        onToggleDemo={onToggleDemo}
        onLoginStatusClick={onLoginStatusClick}
        onHome={onHome}
        onLogout={onLogout}
      />

      {/* ===== 主区 ===== */}
      <main className="main">
        {notice && (
          <div className="workbench-notice">
            <span>{notice}</span>
            <button type="button" className="workbench-notice-close" onClick={onDismissNotice} title="关闭">
              ✕
            </button>
          </div>
        )}

        {/* 顶栏 */}
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{title} — 舆情分析</span>
            {(loading || data) && (
              <span className="topbar-badge">
                <span className="live-dot"></span>
                {loading ? '分析中' : '分析完成'}
              </span>
            )}
          </div>
          <div className="topbar-right">
            <button className="icon-btn" title="复制报告" onClick={handleShare} disabled={!data}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="icon-btn" title="导出 HTML 报告" onClick={handleExportHtml} disabled={!data}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 对话容器 */}
        <div className="chat-container">
          {/* 消息流（空态内展示热搜榜单） */}
          <WorkbenchMessages
            user={user}
            keyword={result?.keyword || viewRecord?.keyword || activeKeyword}
            sourceLabel={
              viewRecord
                ? viewRecord.source === 'mindspider'
                  ? `爬虫 · ${viewRecord.platform}`
                  : '搜索'
                : collectSource === 'mindspider'
                  ? `MindSpider 爬虫 · ${collectPlatform || 'weibo'}`
                  : '多源搜索'
            }
            statuses={statuses}
            loading={loading}
            result={result}
            record={viewRecord}
            streamReport={streamReport}
            thinking={thinking}
            error={error}
            onAsk={onPickKeyword}
            onCopyReport={handleShare}
            onExportHtml={handleExportHtml}
            hotList={hotList}
            hotError={hotError}
            hotLoading={hotLoading}
            updatedAgo={updatedAgo}
            onRefreshHot={loadHot}
          />

          {/* 输入区 */}
          <WorkbenchInput
            loading={loading}
            onAnalyze={onAnalyze}
            models={models}
            primaryId={primaryId}
            onSetPrimary={onSetPrimary}
            templateId={templateId}
            onSelectTemplate={onSelectTemplate}
            collectSource={collectSource}
            collectPlatform={collectPlatform}
            onSourceChange={onSourceChange}
            onPlatformChange={onPlatformChange}
            seedKeyword={seedKeyword}
          />
        </div>
      </main>
    </div>
  )
}

/** 热度数值格式化（万 / 亿） */
function fmtHot(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}w`
  return String(n)
}
