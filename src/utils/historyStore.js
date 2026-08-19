/**
 * historyStore.js —— 历史分析记录（localStorage 持久化）
 * ---------------------------------------------------
 * 记录用户发起过的分析关键词，供「历史分析记录」面板一键重新分析。
 * - 以 keyword 去重（重复分析同关键词会刷新时间并置顶）；
 * - 最多保留 MAX 条（最新在前）；
 * - localStorage 读写失败时静默降级为空列表，不影响主流程。
 */

const STORAGE_KEY = 'agentmind_history'
const MAX_ITEMS = 10

/** 从 localStorage 读取历史记录 */
export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(list) ? list.filter((h) => h && h.keyword) : []
  } catch {
    return []
  }
}

/** 记录一次分析（去重置顶 + 截断上限），返回更新后的完整列表 */
export function saveHistory(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return loadHistory()
  const next = [{ keyword: kw, ts: Date.now() }, ...loadHistory().filter((h) => h.keyword !== kw)]
  const trimmed = next.slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* 忽略写入失败（隐私模式等场景） */
  }
  return trimmed
}

/** 删除单条记录，返回更新后的列表 */
export function removeHistoryItem(keyword) {
  const next = loadHistory().filter((h) => h.keyword !== keyword)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

/** 清空全部记录 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return []
}
