/**
 * server/index.js —— AgentMind 轻量后端
 * ---------------------------------------------------
 * 职责：
 *   1. 代理 LLM 调用（密钥留在服务端，不暴露给浏览器）；
 *   2. 通过 Bocha 博查 AI 搜索真实采集全网舆情文本与来源。
 *
 * 参考 BettaFish（666ghj/BettaFish）的后端服务与搜索工具设计。
 * 所有密钥从项目根目录 .env 读取（不带 VITE_ 前缀，仅服务端可见）。
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bochaSearch, bochaWebSearch } from './bocha.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// 云平台（Render 等）通过 PORT 注入端口；本地回退到 SERVER_PORT。
const PORT = process.env.PORT || process.env.SERVER_PORT || 3100

// ---------- 配置 ----------
const LLM = {
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,
  timeout: Number(process.env.LLM_TIMEOUT || 100000)
}
const BOCHA = {
  apiKey: process.env.BOCHA_API_KEY,
  baseURL: process.env.BOCHA_BASE_URL || 'https://api.bochaai.com/v1/web-search',
  // 接口类型：web（默认，便宜、够用）| ai（带 AI 总结，较贵）
  mode: (process.env.BOCHA_MODE || 'web').toLowerCase()
}

// 去除 HTML 标签与多余空白
function stripHtml(str = '') {
  return String(str)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    llm: Boolean(LLM.apiKey && LLM.baseURL && LLM.model),
    bocha: Boolean(BOCHA.apiKey)
  })
})

// ---------- 舆情采集：Bocha AI 搜索 ----------
app.post('/api/collect', async (req, res) => {
  const { keyword, limit = 15, freshness = 'noLimit' } = req.body || {}
  const kw = String(keyword || '').trim()
  if (!kw) {
    return res.status(400).json({ error: '缺少 keyword 参数' })
  }

  try {
    const searchFn = BOCHA.mode === 'ai' ? bochaSearch : bochaWebSearch
    const { webpages, answer } = await searchFn({
      apiKey: BOCHA.apiKey,
      baseURL: BOCHA.baseURL,
      query: `${kw} 舆情 评价 讨论`,
      count: Math.min(Number(limit) || 15, 30),
      answer: false,
      freshness
    })

    // 组织成舆情文本 + 来源列表
    const items = []
    const sources = []
    const seen = new Set()

    for (const w of webpages) {
      const title = stripHtml(w.name)
      const snippet = stripHtml(w.snippet)
      const text = snippet ? `${title}。${snippet}` : title
      if (!text || seen.has(text)) continue
      seen.add(text)
      items.push(text)
      sources.push({
        title,
        url: w.url,
        displayUrl: w.displayUrl,
        date: w.datePublished
      })
    }

    if (items.length === 0) {
      return res.status(404).json({
        error: `Bocha 未检索到「${kw}」的相关舆情，请更换关键词或稍后重试。`
      })
    }

    res.json({ texts: items, sources, aiSummary: answer })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Bocha 采集失败' })
  }
})

// ---------- LLM 代理 ----------
app.post('/api/llm', async (req, res) => {
  const { system, user, json = false, temperature } = req.body || {}

  if (!LLM.apiKey || !LLM.baseURL || !LLM.model) {
    return res
      .status(500)
      .json({ error: '服务端未配置 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL。' })
  }

  const body = {
    model: LLM.model,
    temperature: temperature ?? 0.7,
    messages: [
      { role: 'system', content: system || '' },
      { role: 'user', content: user || '' }
    ]
  }
  if (json) body.response_format = { type: 'json_object' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM.timeout)

  try {
    const r = await fetch(LLM.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res
        .status(502)
        .json({ error: `LLM 调用失败（HTTP ${r.status}）：${text.slice(0, 200)}` })
    }

    const data = await r.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return res.status(502).json({ error: 'LLM 返回内容为空' })
    }
    res.json({ content: content.trim() })
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: `LLM 调用超时（>${LLM.timeout / 1000}s）` })
    }
    res.status(502).json({ error: `LLM 调用异常：${err.message}` })
  } finally {
    clearTimeout(timer)
  }
})

// ---------- LLM 流式代理（SSE）----------
// 实时转发大模型的 token 流，供前端展示"思考/撰写"过程。
// 支持 deepseek-reasoner 的 reasoning_content（思考链）。
app.post('/api/llm/stream', async (req, res) => {
  const { system, user, temperature } = req.body || {}

  if (!LLM.apiKey || !LLM.baseURL || !LLM.model) {
    return res
      .status(500)
      .json({ error: '服务端未配置 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL。' })
  }

  // 建立 SSE 连接
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const body = {
    model: LLM.model,
    temperature: temperature ?? 0.7,
    stream: true,
    messages: [
      { role: 'system', content: system || '' },
      { role: 'user', content: user || '' }
    ]
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM.timeout)

  try {
    const r = await fetch(LLM.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    if (!r.ok || !r.body) {
      const text = await r.text().catch(() => '')
      send('error', { error: `LLM 调用失败（HTTP ${r.status}）：${text.slice(0, 200)}` })
      return res.end()
    }

    const reader = r.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // 按 SSE 行解析 OpenAI 流式格式（data: {...}）
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue

        try {
          const json = JSON.parse(payload)
          const delta = json?.choices?.[0]?.delta || {}
          if (delta.reasoning_content) {
            send('reasoning', { text: delta.reasoning_content })
          }
          if (delta.content) {
            full += delta.content
            send('token', { text: delta.content })
          }
        } catch {
          // 忽略无法解析的分片
        }
      }
    }

    send('done', { content: full.trim() })
    res.end()
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? `LLM 调用超时（>${LLM.timeout / 1000}s）`
        : `LLM 调用异常：${err.message}`
    send('error', { error: msg })
    res.end()
  } finally {
    clearTimeout(timer)
  }
})

// ---------- 生产环境：托管前端静态文件 ----------
// 执行 `npm run build` 后，Vite 会输出到项目根目录的 dist/。
// 后端直接托管这些文件，实现前后端合一部署（单个服务即可上线）。
const distDir = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distDir))

// SPA 兜底：非 /api 路由都返回 index.html，交给前端路由处理。
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`\n🐟 AgentMind 后端已启动: http://localhost:${PORT}`)
  console.log(`   LLM   配置: ${LLM.apiKey ? '✓' : '✗ 缺失'}`)
  console.log(`   Bocha 配置: ${BOCHA.apiKey ? '✓' : '✗ 缺失'}\n`)
})
