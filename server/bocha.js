/**
 * server/bocha.js —— Bocha 博查搜索封装
 * ---------------------------------------------------
 * 参考 BettaFish 的 MediaEngine/tools/search.py 实现。
 * 提供两种接口：
 *   - bochaWebSearch : Web Search（/v1/web-search），纯网页搜索，便宜、够用（默认）
 *   - bochaSearch    : AI Search（/v1/ai-search），带 AI 总结与多模态，较贵
 * 按关键词真实检索全网舆情，返回网页正文摘要与来源列表。
 */

const DEFAULT_AI_SEARCH_URL = 'https://api.bochaai.com/v1/ai-search'
const DEFAULT_WEB_SEARCH_URL = 'https://api.bochaai.com/v1/web-search'

/**
 * 解析 Bocha AI Search 的原始响应，提取网页结果与 AI 总结。
 * 响应结构：{ code, messages: [{ role, type, content_type, content }] }
 */
function parseBochaResponse(payload) {
  const webpages = []
  let answer = ''

  const messages = Array.isArray(payload?.messages) ? payload.messages : []
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue

    let content = msg.content
    try {
      content = JSON.parse(msg.content)
    } catch {
      // content 为纯文本（如 answer），保持原样
    }

    if (msg.type === 'answer' && msg.content_type === 'text') {
      answer = typeof content === 'string' ? content : ''
    } else if (msg.type === 'source' && msg.content_type === 'webpage') {
      const list = content?.value || []
      for (const item of list) {
        webpages.push({
          name: item.name || '',
          url: item.url || '',
          snippet: item.snippet || item.summary || '',
          displayUrl: item.displayUrl || '',
          datePublished: item.datePublished || item.dateLastCrawled || ''
        })
      }
    }
  }

  return { answer, webpages }
}

/**
 * 调用 Bocha Web Search（纯网页搜索，推荐用于舆情采集）。
 * 返回结构：{ code, data: { webPages: { value: [...] } } }
 * @param {Object} params
 * @param {string} params.apiKey    Bocha API 密钥
 * @param {string} params.query     搜索关键词
 * @param {number} [params.count]   期望结果数（最大 50）
 * @param {boolean} [params.summary] 是否返回长摘要 summary
 * @param {string} [params.baseURL] 接口地址
 * @param {string} [params.freshness] 时间范围：oneDay/oneWeek/oneMonth/oneYear/noLimit
 * @returns {Promise<{answer:string, webpages:Array}>}
 */
export async function bochaWebSearch({
  apiKey,
  query,
  count = 15,
  summary = true,
  baseURL = DEFAULT_WEB_SEARCH_URL,
  freshness = 'noLimit'
}) {
  if (!apiKey) {
    throw new Error('未配置 BOCHA_API_KEY，请在 .env 中填写 Bocha 博查 API 密钥。')
  }

  const res = await fetch(baseURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      count: Math.min(count, 50),
      summary,
      freshness
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bocha 搜索失败（HTTP ${res.status}）：${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(`Bocha 接口返回错误：${data.msg || data.message || '未知错误'}`)
  }

  const list = data?.data?.webPages?.value || []
  const webpages = list.map((item) => ({
    name: item.name || '',
    url: item.url || '',
    snippet: item.summary || item.snippet || '',
    displayUrl: item.displayUrl || item.siteName || '',
    datePublished: item.datePublished || item.dateLastCrawled || ''
  }))

  return { answer: '', webpages }
}

/**
 * 调用 Bocha AI 搜索（带 AI 总结与多模态，成本较高）。
 * @param {Object} params
 * @param {string} params.apiKey    Bocha API 密钥
 * @param {string} params.query     搜索关键词
 * @param {number} [params.count]   期望结果数
 * @param {boolean} [params.answer] 是否开启 AI 总结
 * @param {string} [params.baseURL] 接口地址
 * @param {string} [params.freshness] 时间范围：oneDay/oneWeek/oneMonth/oneYear/noLimit
 * @returns {Promise<{answer:string, webpages:Array}>}
 */
export async function bochaSearch({
  apiKey,
  query,
  count = 15,
  answer = false,
  baseURL = DEFAULT_AI_SEARCH_URL,
  freshness = 'noLimit'
}) {
  if (!apiKey) {
    throw new Error('未配置 BOCHA_API_KEY，请在 .env 中填写 Bocha 博查 API 密钥。')
  }

  const res = await fetch(baseURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: '*/*'
    },
    body: JSON.stringify({
      query,
      count,
      answer,
      freshness,
      stream: false
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bocha 搜索失败（HTTP ${res.status}）：${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(`Bocha 接口返回错误：${data.msg || '未知错误'}`)
  }

  return parseBochaResponse(data)
}
