import { useState, useEffect, useCallback } from 'react'
import { fetchHotList } from '../services/hotlistService.js'

/**
 * HotList —— 全网实时热搜榜
 * ---------------------------------------------------
 * 展示天行数据热搜榜单，点击任一热点即可一键填入关键词并分析。
 * @param {(keyword:string)=>void} props.onPick 选中热点回调
 * @param {boolean} props.disabled 分析进行中禁用点击
 */
export default function HotList({ onPick, disabled }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchHotList()
      setList(data)
    } catch (err) {
      setError(err.message || '热搜榜获取失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 热度数值格式化（万 / 亿）
  function fmtHot(n) {
    if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`
    if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`
    return String(n)
  }

  return (
    <section className="card hotlist-panel">
      <h2 className="card-title">
        <span className="title-bar" />
        全网实时热搜
        <button
          type="button"
          className="hotlist-refresh"
          onClick={load}
          disabled={loading}
          title="刷新热搜"
        >
          {loading ? '刷新中…' : '↻ 刷新'}
        </button>
      </h2>

      {error && <p className="hotlist-error">⚠ {error}</p>}

      {!error && list.length === 0 && !loading && (
        <p className="hotlist-empty">暂无热搜数据（请检查后端 TIANAPI_KEY 配置）。</p>
      )}

      <ol className="hotlist">
        {list.map((item, i) => (
          <li key={`${item.title}-${i}`} className="hotlist-item">
            <button
              type="button"
              className="hotlist-link"
              onClick={() => onPick?.(item.title)}
              disabled={disabled}
              title={item.digest || '点击分析该热点'}
            >
              <span className={`hotlist-rank rank-${i < 3 ? 'top' : 'normal'}`}>
                {i + 1}
              </span>
              <span className="hotlist-title">{item.title}</span>
              {item.hotnum > 0 && (
                <span className="hotlist-hot">{fmtHot(item.hotnum)}</span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
