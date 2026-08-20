import { useState, useEffect } from 'react'
import { AGENT_STEPS } from '../services/agentOrchestrator.js'
import { ENABLE_DEBATE } from '../config.js'
import { renderDetail } from '../components/agentDetail.jsx'
import ReportPanel from '../components/ReportPanel.jsx'
import { buildFlowHtml, downloadTextFile, safeName } from '../utils/flowExport.js'

/**
 * WorkbenchMessages —— 对话消息流
 * - 空态：热搜榜单（横向简洁 chips，无多余图标）
 * - 对话：用户消息 → 流水线卡（六步时间线，每步可展开查看真实中间产物）
 *         → 流式撰写气泡 → 舆情分析报告（数据可视化 + 完整报告，一套卡片一套导出）
 */
export default function WorkbenchMessages({
  user,
  keyword,
  sourceLabel,
  statuses = {},
  loading,
  result,
  record,
  streamReport,
  thinking,
  error,
  onAsk,
  onCopyReport,
  onExportHtml,
  hotList,
  hotError,
  hotLoading,
  updatedAgo,
  onRefreshHot
}) {
  const steps = ENABLE_DEBATE ? AGENT_STEPS : AGENT_STEPS.filter((s) => s.id !== 'debate')
  const data = record?.result || result
  const hasConversation = loading || data || record?.step_state
  const userName = user?.username || '分析师'
  const [open, setOpen] = useState({})
  const [elapsed, setElapsed] = useState(0)

  // 流水线耗时
  useEffect(() => {
    if (!loading) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [loading])

  function toggleStep(id) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // 空态：热搜榜单
  if (!hasConversation) {
    return (
      <div className="messages-area">
        <div className="messages-inner">
          <div className="welcome-state">
            <div className="welcome-hotsearch">
              <div className="hotsearch-header">
                <div className="hotsearch-title">实时热搜榜</div>
                <button className="hotsearch-refresh" onClick={onRefreshHot} disabled={hotLoading}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {hotLoading ? '更新中…' : updatedAgo > 0 ? `${updatedAgo}分钟前更新` : '刚刚更新'}
                </button>
              </div>
              {hotError ? (
                <div className="hotsearch-error">⚠ {hotError}</div>
              ) : (
                <div className="hotsearch-list">
                  {hotList.map((item, i) => (
                    <button
                      key={`${item.title}-${i}`}
                      className="hotsearch-item"
                      onClick={() => onAsk?.(item.title)}
                      disabled={loading}
                      title={item.digest || '点击分析该热点'}
                    >
                      <span className={`hotsearch-rank ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'normal'}`}>
                        {i + 1}
                      </span>
                      <span className="hotsearch-text">{item.title}</span>
                      {item.hotnum > 0 && (
                        <span className="hotsearch-heat">{fmtHot(item.hotnum)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="welcome-subtitle" style={{ marginTop: 32, marginBottom: 0 }}>
              点击热点一键分析，或在下方输入关键词、一句话需求、粘贴舆情文本，
              六个 AI 智能体将自动完成全流程。
            </p>
          </div>
        </div>
      </div>
    )
  }

  const nowTime = new Date()
  const timeStr = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`

  return (
    <div className="messages-area">
      <div className="messages-inner">
        {/* 用户消息 */}
        <div className="message user">
          <div className="message-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="message-body">
            <div className="message-header">
              <span className="message-name">{userName}</span>
              <span className="message-time">{timeStr}</span>
            </div>
            <div className="message-content">
              {userRequestText()}
            </div>
          </div>
        </div>

        {/* 流水线卡：六步时间线，每步可展开查看中间产物 */}
        {(loading || data || record?.step_state) && (
          <div className="message assistant">
            <div className="message-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="18" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8.5 12L15.5 12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
              </svg>
            </div>
            <div className="message-body">
              <div className="message-header">
                <span className="message-name">AgentMind</span>
                <span className="message-time">{timeStr}</span>
              </div>
              <div className="message-content">
                {loading ? '已启动六智能体流水线，正在并行采集与分析...' : '六智能体流水线执行记录（点击步骤可展开中间产物）：'}
                <PipelineCard
                  steps={steps}
                  statuses={statuses}
                  loading={loading}
                  record={record}
                  elapsed={elapsed}
                  open={open}
                  onToggle={toggleStep}
                  keyword={keyword}
                />
              </div>
            </div>
          </div>
        )}

        {/* 流式报告生成 */}
        {loading && (thinking || streamReport) && (
          <div className="message assistant">
            <div className="message-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="3" width="12" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 8L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 12L15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 16L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="message-body">
              <div className="message-header">
                <span className="message-name">AgentMind</span>
                <span className="message-time">{timeStr}</span>
              </div>
              <div className="message-content">
                报告生成中，实时撰写过程：
                <div className="stream-box">
                  {thinking && <pre>💭 {thinking}</pre>}
                  {streamReport && <pre>{streamReport}</pre>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 错误消息 */}
        {error && (
          <div className="message assistant message-error">
            <div className="message-avatar">⚠</div>
            <div className="message-body">
              <div className="message-header">
                <span className="message-name">AgentMind</span>
                <span className="message-time">{timeStr}</span>
              </div>
              <div className="message-content">{error}</div>
            </div>
          </div>
        )}

        {/* 舆情分析报告：数据可视化 + 完整报告（一套卡片一套导出） */}
        {data && (
          <div className="message assistant">
            <div className="message-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="message-body">
              <div className="message-header">
                <span className="message-name">AgentMind</span>
                <span className="message-time">{timeStr}</span>
              </div>
              <div className="message-content">
                <div className="final-report">
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="14 2 14 8 20 8" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        舆情分析报告
                      </div>
                      <div className="result-card-actions">
                        <button className="result-action-btn" onClick={onCopyReport} title="复制报告">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          复制
                        </button>
                        <button className="result-action-btn" onClick={onExportHtml} title="导出 HTML">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          HTML
                        </button>
                      </div>
                    </div>

                    {/* 数据可视化：情感分布（多模型校准）+ 关键词热度 Top 10 + 综合风险等级 */}
                    <div className="sentiment-overview">
                      <div className="sentiment-block">
                        <h4>情感分布（多模型校准）</h4>
                        <div className="sentiment-bars">
                          <SentiRow label="正面" val={data.analyze?.sentiment?.positive} color="var(--chartreuse)" />
                          <SentiRow label="负面" val={data.analyze?.sentiment?.negative} color="var(--risk)" />
                          <SentiRow label="中性" val={data.analyze?.sentiment?.neutral} color="var(--signal-400)" />
                        </div>
                        {data.trend?.riskLevel?.level && (
                          <div className="risk-indicator">
                            <div>
                              <div className="risk-label">综合风险等级</div>
                              <div className="risk-level">{data.trend.riskLevel.level}</div>
                            </div>
                            <div className="risk-score">{data.trend.riskLevel.score} / 100</div>
                          </div>
                        )}
                      </div>
                      <div className="sentiment-block">
                        <h4>关键词热度 Top 10</h4>
                        <div className="keyword-tags">
                          {(data.analyze?.keywords || []).slice(0, 10).map((k) => (
                            <span className="keyword-tag" key={k.word}>
                              {k.word}
                              <span className="kw-weight">{k.weight}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 完整报告：与可视化同一套卡片（嵌入模式，不再重复标题与导出入口） */}
                    <div className="full-report">
                      <ReportPanel
                        report={data.report}
                        debate={data.debate}
                        sources={data.sources}
                        result={data}
                        embedded
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  function userRequestText() {
    if (record) {
      return `回看「${record.keyword}」的分析记录（${record.source === 'mindspider' ? `爬虫·${record.platform}` : '搜索'} · ${record.sample_count || '-'}条样本）`
    }
    return `分析「${keyword || '…'}」事件的舆情走向、风险等级和核心诉求${sourceLabel ? `（${sourceLabel}）` : ''}。`
  }
}

/* ===== 六步流水线时间线（每步可展开中间产物） ===== */
function PipelineCard({ steps, statuses, loading, record, elapsed, open, onToggle, keyword }) {
  function stepStateOf(stepId) {
    if (record) {
      const saved = record.step_state?.[stepId]
      if (!saved) return { status: 'pending', detail: null }
      return { status: saved.status === 'failed' ? 'failed' : saved.status || 'done', detail: saved.detail }
    }
    const entry = statuses[stepId] || {}
    return { status: entry.status || 'pending', detail: entry.detail }
  }

  const states = steps.map((s) => ({ step: s, ...stepStateOf(s.id) }))
  const doneCount = states.filter((s) => s.status === 'done').length
  const isAllDone = doneCount === steps.length

  // 流水线产物导出 HTML（含各步骤真实中间产物）
  function exportFlowHtml() {
    const exportStatuses = {}
    steps.forEach((s) => {
      const st = stepStateOf(s.id)
      exportStatuses[s.id] = { status: st.status, detail: st.detail }
    })
    const html = buildFlowHtml(exportStatuses, { keyword: keyword || '舆情分析' })
    downloadTextFile(html, `多智能体协作流程产物_${safeName(keyword || 'flow')}.html`, 'text/html;charset=utf-8')
  }

  return (
    <div className="pipeline-card">
      <div className="pipeline-card-header">
        <div className="pipeline-card-title">
          {!isAllDone && <span className="pulse"></span>}
          {isAllDone ? '智能体流水线' : '智能体流水线 · 实时运行'}
        </div>
        <div className="pipeline-status" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>
            {isAllDone ? `${doneCount}/${steps.length} 完成` : `${doneCount}/${steps.length} 完成${loading ? ` · 已耗时 ${elapsed}s` : ''}`}
          </span>
          <button
            type="button"
            className="result-action-btn"
            onClick={exportFlowHtml}
            title="导出流水线中间产物为 HTML"
            disabled={doneCount === 0}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            导出 HTML
          </button>
        </div>
      </div>
      <div className="agent-steps">
        {states.map(({ step, status, detail }) => {
          const hasDetail = Boolean(detail) && status !== 'idle'
          const expanded = open[step.id] ?? status === 'running'
          return (
            <div key={step.id} className={`agent-step ${status}`}>
              <div className="agent-step-icon">{StepIcon(step.id)}</div>
              <div className="agent-step-body">
                <button
                  type="button"
                  className={`agent-step-head step-head-btn ${hasDetail ? 'clickable' : ''}`}
                  onClick={() => hasDetail && onToggle(step.id)}
                  disabled={!hasDetail}
                  title={hasDetail ? (expanded ? '收起中间产物' : '展开中间产物') : undefined}
                >
                  <span className="agent-step-name">{step.name}</span>
                  <span className={`agent-step-tag ${tagClass(status)}`}>{tagLabel(status)}</span>
                  {hasDetail && <span className={`agent-step-caret ${expanded ? 'up' : ''}`}>▾</span>}
                </button>
                <div className="agent-step-desc">{step.desc}</div>
                <div className="agent-step-output">
                  {status === 'running' && <span className="spinner" />}
                  {status === 'done' && (
                    <svg className="check" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {status === 'failed' && <span className="fail">✕</span>}
                  {status === 'pending' && <span style={{ color: 'var(--ink-500)' }}>○</span>}
                  <span>{outputText(step.id, status, detail)}</span>
                </div>
                {hasDetail && expanded && (
                  <div className="agent-step-detail">{renderDetail(step.id, detail)}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function tagClass(status) {
  return { running: 'tag-running', done: 'tag-done', pending: 'tag-pending', failed: 'tag-failed', skipped: 'tag-done' }[status] || 'tag-pending'
}
function tagLabel(status) {
  return { running: '运行中', done: '已完成', pending: '待运行', failed: '失败', skipped: '已跳过' }[status] || '待运行'
}

function outputText(stepId, status, d) {
  if (status === 'pending') return '等待执行'
  if (status === 'running') return stepId === 'analyze' ? '多模型并行情感分析中…' : '执行中…'
  if (status === 'failed') return '执行失败，可点击历史记录继续'
  if (!d) return '已完成'
  switch (stepId) {
    case 'collect':
      return `采集 ${d.count} 条有效样本${d.mode ? ` · ${d.mode}` : ''} · 来源链接已溯源`
    case 'clean':
      return `清洗后 ${d.after} 条 · 去重/去广告/去无效 ${Math.max(0, (d.before || 0) - (d.after || 0))} 条`
    case 'analyze': {
      const models = (d.contributors || []).filter((c) => c.kind !== 'local').map((c) => c.label)
      return `${models.length ? models.join(' / ') + ' ' : ''}情感占比 正${d.sentiment?.positive || 0}/负${d.sentiment?.negative || 0}/中${d.sentiment?.neutral || 0}`
    }
    case 'insight':
      return `风险等级：${d.trend || '—'} · ${(d.risks || []).length}项潜在风险 · ${(d.demands || []).length}条核心诉求`
    case 'debate':
      return `${(d.rounds || []).length ? (d.rounds || []).length + '轮辩论' : '交叉验证'} · 一致度 ${d.agreement ?? '—'}% · 共识/分歧已标注`
    case 'report':
      return `报告已生成 · ${d.length}字 · 支持 HTML/PDF/Markdown 导出`
    default:
      return '已完成'
  }
}

const STEP_ICONS = {
  collect: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  clean: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 5L20 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 12L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 19L14 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  analyze: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 20L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 20V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 20V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  insight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 4L12 12L18.9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  debate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 19C4 16.79 5.79 15 8 15L16 15C18.21 15 20 16.79 20 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="3" width="12" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 8L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 12L15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 16L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}
function StepIcon(id) {
  return STEP_ICONS[id] || null
}

function SentiRow({ label, val = 0, color }) {
  return (
    <div className="sentiment-bar-row">
      <span className="sentiment-bar-label">{label}</span>
      <div className="sentiment-bar-track">
        <div className="sentiment-bar-fill" style={{ width: `${val}%`, background: color }} />
      </div>
      <span className="sentiment-bar-val">{val}%</span>
    </div>
  )
}

function fmtHot(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}w`
  return String(n)
}
