/**
 * HistoryPanel —— 历史分析记录面板
 * ---------------------------------------------------
 * 展示 localStorage 中最近分析过的关键词，点击任意一条即可一键重新分析。
 * @param {Array<{keyword:string, ts:number}>} props.history 历史记录（最新在前）
 * @param {(keyword:string)=>void} props.onPick 点击重跑回调
 * @param {(keyword:string)=>void} props.onRemove 删除单条回调
 * @param {()=>void} props.onClear 清空全部回调
 * @param {boolean} props.disabled 分析进行中禁用点击
 */
export default function HistoryPanel({ history, onPick, onRemove, onClear, disabled }) {
  if (!Array.isArray(history) || history.length === 0) return null

  return (
    <section className="card history-panel">
      <h2 className="card-title">
        <span className="title-bar" />
        历史分析记录
        <button
          type="button"
          className="history-clear"
          onClick={onClear}
          disabled={disabled}
          title="清空全部历史记录"
        >
          清空
        </button>
      </h2>

      <ul className="history-list">
        {history.map((h) => (
          <li key={`${h.keyword}-${h.ts}`} className="history-item-wrap">
            <button
              type="button"
              className="history-item"
              onClick={() => onPick(h.keyword)}
              disabled={disabled}
              title="点击重新分析"
            >
              <span className="history-kw">{h.keyword}</span>
              <span className="history-time">{formatTime(h.ts)}</span>
            </button>
            <button
              type="button"
              className="history-del"
              onClick={() => onRemove(h.keyword)}
              disabled={disabled}
              title="删除该条记录"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 相对时间格式化：今天/昨天 HH:mm，更早则 MM-DD HH:mm */
function formatTime(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= dayStart) return `今天 ${hm}`
  if (d.getTime() >= dayStart - 86400000) return `昨天 ${hm}`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}
