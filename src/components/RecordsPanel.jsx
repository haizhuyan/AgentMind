/**
 * RecordsPanel —— 账号下的分析记录面板（服务端存储）
 * ---------------------------------------------------
 * 登录用户可见：每次完成的分析自动保存到账号下。
 * 点击记录 → 回看完整结果（图表/报告/来源），无需重新运行流水线。
 * @param {Array} props.records [{id, keyword, source, platform, created_at}]
 * @param {(id:number)=>void} props.onView 回看记录
 * @param {(id:number)=>void} props.onDelete 删除记录
 * @param {boolean} props.disabled 分析进行中禁用
 * @param {number|null} props.activeId 当前回看的记录 id
 */
export default function RecordsPanel({ records = [], onView, onDelete, disabled, activeId }) {
  if (records.length === 0) return null

  return (
    <section className="card records-panel">
      <h2 className="card-title">
        <span className="title-bar" />
        我的分析记录
        <span className="records-count">{records.length} 条</span>
      </h2>

      <ul className="records-list">
        {records.map((r) => (
          <li key={r.id} className={`records-item-wrap ${activeId === r.id ? 'active' : ''}`}>
            <button
              type="button"
              className="records-item"
              onClick={() => onView(r.id)}
              disabled={disabled}
              title={r.status === 'completed' ? '点击回看完整内容' : '点击继续未完成的流程'}
            >
              <span className="records-kw">{r.keyword}</span>
              <span className="records-meta">
                {r.status === 'running' && (
                  <span className="records-status running">● 进行中</span>
                )}
                {r.status === 'failed' && (
                  <span className="records-status failed">✕ 失败</span>
                )}
                {r.source === 'mindspider' ? `爬虫·${r.platform || 'weibo'}` : '搜索'}
                <i>·</i>
                {formatTime(r.created_at)}
              </span>
            </button>
            <button
              type="button"
              className="records-del"
              onClick={() => onDelete(r.id)}
              disabled={disabled}
              title="删除该记录"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatTime(ts) {
  const d = new Date(Number(ts) * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= dayStart) return `今天 ${hm}`
  if (d.getTime() >= dayStart - 86400000) return `昨天 ${hm}`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}
