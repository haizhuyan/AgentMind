import { useState } from 'react'
import { AGENT_STEPS } from '../services/agentOrchestrator.js'
import { ENABLE_DEBATE } from '../config.js'

/**
 * AgentFlow —— 智能体运行状态 + 中间产物展示区
 * 每个 Agent 节点可展开，直观查看它的真实中间产物（采集来源、清洗对比、
 * 情感/关键词、洞察、辩论分歧等），让多智能体协作过程"看得见"。
 * @param {Object} props
 * @param {Object} props.statuses  { stepId: { status, detail } }
 * @param {boolean} props.loading
 */
export default function AgentFlow({ statuses = {}, loading }) {
  const [open, setOpen] = useState({})

  const steps = ENABLE_DEBATE
    ? AGENT_STEPS
    : AGENT_STEPS.filter((s) => s.id !== 'debate')

  function icon(status) {
    switch (status) {
      case 'running':
        return <span className="agent-spinner" />
      case 'done':
        return <span className="agent-check">✓</span>
      case 'failed':
        return <span className="agent-fail">✕</span>
      case 'skipped':
        return (
          <span className="agent-check" style={{ opacity: 0.5 }}>
            —
          </span>
        )
      default:
        return <span className="agent-dot" />
    }
  }

  function label(status) {
    return (
      { running: '运行中', done: '已完成', failed: '失败', skipped: '已跳过' }[
        status
      ] || '待运行'
    )
  }

  function toggle(id) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const progress =
    (steps.filter((s) => {
      const st = statuses[s.id]?.status
      return st === 'done' || st === 'skipped'
    }).length /
      steps.length) *
    100

  return (
    <section className="card agent-flow">
      <h2 className="card-title">
        <span className="title-bar" />
        多智能体协作流程
        {loading && <span className="live-tag">运行中</span>}
      </h2>

      {/* 顶部进度条 */}
      <div className="flow-progress">
        <div className="flow-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="agent-list">
        {steps.map((step) => {
          const entry = statuses[step.id] || {}
          const status = entry.status || 'idle'
          const detail = entry.detail
          const hasDetail = detail && status !== 'idle'
          const expanded = open[step.id] ?? status === 'running'

          return (
            <div key={step.id} className={`agent-row status-${status}`}>
              <div
                className={`agent-row-head ${hasDetail ? 'clickable' : ''}`}
                onClick={() => hasDetail && toggle(step.id)}
              >
                <div className="agent-icon">{icon(status)}</div>
                <div className="agent-meta">
                  <div className="agent-name">{step.name}</div>
                  <div className="agent-desc">{step.desc}</div>
                </div>
                <div className={`agent-status s-${status}`}>{label(status)}</div>
                {hasDetail && (
                  <span className={`agent-caret ${expanded ? 'up' : ''}`}>▾</span>
                )}
              </div>

              {hasDetail && expanded && (
                <div className="agent-detail">{renderDetail(step.id, detail)}</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** 根据步骤类型渲染对应的中间产物视图 */
function renderDetail(stepId, d) {
  // 运行中：展示"处理中"提示与正在协作的模型（真实产物需等该步骤完成）
  if (d && d._running) {
    const list = d.models || (d.reviewers?.length ? d.reviewers : d.model ? [d.model] : [])
    return (
      <div className="detail-running">
        <span className="detail-running-dot" />
        <span>
          {stepId === 'analyze'
            ? '多模型并行分析中…'
            : stepId === 'debate'
              ? '跨模型交叉复核中…'
              : stepId === 'report'
                ? '撰写报告中…'
                : '处理中…'}
        </span>
        {list.length > 0 && (
          <span className="detail-running-models">
            {list.map((label, i) => (
              <span key={i} className="model-badge">
                {label}
              </span>
            ))}
          </span>
        )}
      </div>
    )
  }

  switch (stepId) {
    case 'collect':
      return (
        <>
          <div className="detail-tag">
            数据来源：{d.mode}　·　样本 {d.count} 条
          </div>
          {d.sources?.length > 0 && (
            <ul className="detail-sources">
              {d.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url || '#'} target="_blank" rel="noreferrer">
                    {s.title || s.url}
                  </a>
                  {s.displayUrl && <span className="dim"> · {s.displayUrl}</span>}
                </li>
              ))}
            </ul>
          )}
          {d.samples?.length > 0 && (
            <div className="detail-samples">
              {d.samples.map((t, i) => (
                <div key={i} className="sample-line">
                  {truncate(t, 120)}
                </div>
              ))}
            </div>
          )}
        </>
      )

    case 'clean':
      return (
        <>
          <div className="detail-tag">
            清洗前 {d.before} 条 → 清洗后 <b>{d.after}</b> 条（去重 / 去广告 / 去无效）
          </div>
          <div className="detail-samples">
            {(d.samples || []).map((t, i) => (
              <div key={i} className="sample-line">
                {truncate(t, 120)}
              </div>
            ))}
          </div>
        </>
      )

    case 'analyze':
      return (
        <>
          {d.contributors?.length > 0 && (
            <div className="detail-tag">
              多模型协作分析：
              {d.contributors.map((c, i) => (
                <span key={i} className={`model-badge ${c.ok ? '' : 'model-badge-fail'}`}>
                  {c.ok ? '✓' : '✕'} {c.label}
                </span>
              ))}
            </div>
          )}
          <div className="detail-tag">情感占比{d.contributors?.length > 1 ? '（多模型集成）' : ''}</div>
          <div className="sentiment-bars">
            <SentiBar label="正面" val={d.sentiment?.positive} color="#22c55e" />
            <SentiBar label="负面" val={d.sentiment?.negative} color="#ef4444" />
            <SentiBar label="中性" val={d.sentiment?.neutral} color="#60a5fa" />
          </div>
          {d.keywords?.length > 0 && (
            <div className="detail-chips">
              {d.keywords.map((k, i) => (
                <span key={i} className="chip">
                  {k.word}
                  <i>{k.weight}</i>
                </span>
              ))}
            </div>
          )}
          {d.opinions?.length > 0 && (
            <ul className="detail-list">
              {d.opinions.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          )}
        </>
      )

    case 'insight':
      return (
        <>
          {d.trend && <div className="detail-tag">趋势：{d.trend}</div>}
          {d.risks?.length > 0 && (
            <div className="detail-block">
              <span className="block-label risk">风险</span>
              <ul className="detail-list">
                {d.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.demands?.length > 0 && (
            <div className="detail-block">
              <span className="block-label demand">诉求</span>
              <ul className="detail-list">
                {d.demands.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.cause && <div className="detail-cause">成因：{d.cause}</div>}
        </>
      )

    case 'debate':
      return (
        <>
          <div className="detail-tag">
            多模型交叉验证，平均一致度 <b>{d.agreement}%</b>
            {d.hasDivergence ? '（存在分歧，已二次校准）' : '（结论高度一致）'}
          </div>
          {d.reviewers?.length > 0 && (
            <div className="detail-tag">
              参与复核：
              {d.reviewers.map((r, i) => (
                <span key={i} className={`model-badge ${r.ok ? '' : 'model-badge-fail'}`}>
                  {r.ok ? `✓ ${r.label}（${r.agreement}%）` : `✕ ${r.label}`}
                </span>
              ))}
            </div>
          )}
          {d.disputes?.length > 0 && (
            <div className="detail-block">
              <span className="block-label risk">分歧点</span>
              <ul className="detail-list">
                {d.disputes.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.supplement?.length > 0 && (
            <div className="detail-block">
              <span className="block-label demand">补充</span>
              <ul className="detail-list">
                {d.supplement.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )

    case 'report':
      return <div className="detail-tag">报告已生成（{d.length} 字）</div>

    default:
      return null
  }
}

function SentiBar({ label, val = 0, color }) {
  return (
    <div className="senti-bar-row">
      <span className="senti-label">{label}</span>
      <div className="senti-track">
        <div className="senti-fill" style={{ width: `${val}%`, background: color }} />
      </div>
      <span className="senti-val">{val}%</span>
    </div>
  )
}

function truncate(s = '', n = 100) {
  return s.length > n ? s.slice(0, n) + '…' : s
}
