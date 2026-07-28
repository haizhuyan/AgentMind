/**
 * server/anspire.js —— Anspire 安思派 AI 搜索封装
 * ---------------------------------------------------
 * 作为 Bocha 之外的第二个真实数据源，缓解「单一搜索源」问题。
 * 接口：GET https://plugin.anspire.cn/api/ntsearch/search
 * 鉴权：Header  Authorization: Bearer {API KEY}
 * 响应：{ query, Uuid, results: [{ title, content, url, score, date }] }
 *
 * 输出结构与 bocha.js 对齐（webpages: { name, url, snippet, displayUrl, datePublished }），
 * 便于在 /api/collect 中与 Bocha 结果统一聚合去重。
 */

const DEFAULT_ANSPIRE_URL = 'https://plugin.anspire.cn/api/ntsearch/search'

/**
 * 从 URL 中提取展示域名（displayUrl）。
 */
function hostOf(url = '') {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/**
 * 调用 Anspire AI 搜索。
 * @param {Object} params
 * @param {string} params.apiKey       Anspire API 密钥
 * @param {string} params.query        搜索关键词（不超过 64 字）
 * @param {number} [params.count]      返回条数 top_k（10/20/30/40/50，默认 10）
 * @param {string} [params.baseURL]    接口地址
 * @param {number} [params.regionMode] 检索区域：0 国内 / 1 海外 / 2 混合（默认 0）
 * @param {string} [params.fromTime]   起始时间 eg: 2025-01-01 00:00:00
 * @param {string} [params.toTime]     结束时间 eg: 2025-01-01 00:00:00
 * @returns {Promise<{answer:string, webpages:Array}>}
 */
export async function anspireSearch({
  apiKey,
  query,
  count = 10,
  baseURL = DEFAULT_ANSPIRE_URL,
  regionMode = 0,
  fromTime,
  toTime
}) {
  if (!apiKey) {
    throw new Error('未配置 ANSPIRE_API_KEY，请在 .env 中填写 Anspire 安思派 API 密钥。')
  }

  // query 不超过 64 个字符
  const q = String(query || '').slice(0, 64)

  const params = new URLSearchParams({
    query: q,
    top_k: String(Math.min(Number(count) || 10, 50)),
    search_type: 'web',
    region_mode: String(regionMode)
  })
  if (fromTime) params.set('FromTime', fromTime)
  if (toTime) params.set('ToTime', toTime)

  const res = await fetch(`${baseURL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      Accept: '*/*'
    }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anspire 搜索失败（HTTP ${res.status}）：${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const list = Array.isArray(data?.results) ? data.results : []

  const webpages = list.map((item) => ({
    name: item.title || '',
    url: item.url || '',
    snippet: item.content || '',
    displayUrl: hostOf(item.url),
    datePublished: item.date || ''
  }))

  return { answer: '', webpages }
}
