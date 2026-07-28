/**
 * server/hotlist.js —— 全网热搜榜封装（天行数据 TianAPI）
 * ---------------------------------------------------
 * 接口：GET https://apis.tianapi.com/networkhot/index?key={apiKey}
 * 响应：{ code, msg, result: { list: [{ title, digest, hotnum }] } }
 * 用于在首页渲染实时热搜榜，用户可点击热点一键填入关键词分析。
 */

const DEFAULT_HOTLIST_URL = 'https://apis.tianapi.com/networkhot/index'

/**
 * 拉取全网热搜榜单。
 * @param {Object} params
 * @param {string} params.apiKey    TianAPI 密钥
 * @param {string} [params.baseURL] 接口地址
 * @returns {Promise<Array<{title:string, digest:string, hotnum:number}>>}
 */
export async function fetchHotList({ apiKey, baseURL = DEFAULT_HOTLIST_URL }) {
  if (!apiKey) {
    throw new Error('未配置 TIANAPI_KEY，请在 .env 中填写天行数据 API 密钥。')
  }

  const res = await fetch(`${baseURL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`热搜榜请求失败（HTTP ${res.status}）：${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(`热搜榜接口返回错误：${data.msg || '未知错误'}`)
  }

  const list = Array.isArray(data?.result?.list) ? data.result.list : []
  return list.map((item) => ({
    title: item.title || '',
    digest: item.digest || '',
    hotnum: Number(item.hotnum) || 0
  }))
}
