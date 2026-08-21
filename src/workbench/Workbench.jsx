import { useState, useEffect, useCallback } from 'react'
import WorkbenchSidebar from './WorkbenchSidebar.jsx'
import WorkbenchMessages from './WorkbenchMessages.jsx'
import WorkbenchInput from './WorkbenchInput.jsx'
import { fetchHotList } from '../services/hotlistService.js'
import { downloadHtmlReport } from '../utils/htmlReport.js'
import { downloadReportPdf } from '../utils/pdfExport.js'
import { downloadMarkdownReport } from '../utils/mdExport.js'
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
  chatMessages = [],
  chatLoading = false,
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
  onChat,
  onStop,
  onRetry,
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
  const hasReport = Boolean(data?.report)
  const title = viewRecord?.keyword || result?.keyword || activeKeyword || '新建分析'
  const updatedAgo = lastUpdated ? Math.max(1, Math.round((now - lastUpdated) / 60000)) : 0

  // 顶栏 / 报告卡：复制 + HTML / PDF / Markdown 导出
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
    downloadHtmlReport(data)
  }

  async function handleExportPdf() {
    if (!data) return
    try {
      await downloadReportPdf(data)
    } catch (err) {
      alert(`PDF 导出失败：${err?.message || '未知错误'}`)
    }
  }

  function handleExportMd() {
    if (!data) return
    downloadMarkdownReport(data)
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
            {loading && (
              <button className="icon-btn stop-btn" title="停止分析" onClick={onStop}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
                停止
              </button>
            )}
            <button className="icon-btn" title="复制报告" onClick={handleShare} disabled={!data}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            error={error}
            onAsk={onPickKeyword}
            onCopyReport={handleShare}
            onExportHtml={handleExportHtml}
            onExportPdf={handleExportPdf}
            onExportMd={handleExportMd}
            onRetry={onRetry}
            hotList={hotList}
            hotError={hotError}
            hotLoading={hotLoading}
            updatedAgo={updatedAgo}
            onRefreshHot={loadHot}
          />

          {/* 输入区 */}
          <WorkbenchInput
            loading={loading}
            chatLoading={chatLoading}
            hasReport={hasReport}
            onAnalyze={onAnalyze}
            onChat={onChat}
            onStop={onStop}
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
