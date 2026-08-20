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
import { anspireSearch } from './anspire.js'
import { fetchHotList } from './hotlist.js'
import { fetchHotListBySpider, crawlBySpider, checkMindSpiderEnv } from './mindspider.js'
import { createCrawlJob, getCrawlJob, getCrawlQueueStatus } from './crawlQueue.js'
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js'
import {
  createUser,
  getUserByUsername,
  createRecord,
  listRecords,
  getRecordById,
  deleteRecord,
  updateRecordStep,
  finishRecord
} from './db.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// 云平台（Render 等）通过 PORT 注入端口；本地回退到 SERVER_PORT。
const PORT = process.env.PORT || process.env.SERVER_PORT || 3100

// ---------- 配置 ----------
// 多模型注册表：从环境变量收集 LLM_*, LLM2_*, LLM3_* ... 任意多个槽位。
// 每个槽位需同时配置 *_BASE_URL / *_API_KEY / *_MODEL 才会启用。
// *_LABEL 为界面展示名（可选）。
function buildModels() {
  // 槽位 1 用空后缀（LLM_*），其余用序号后缀（LLM2_*、LLM3_* …）。
  const slots = [{ key: '', id: 'default' }]
  for (let i = 2; i <= 12; i++) {
    slots.push({ key: String(i), id: `llm${i}` })
  }

  const models = []
  for (const { key, id } of slots) {
    const baseURL = process.env[`LLM${key}_BASE_URL`]
    const apiKey = process.env[`LLM${key}_API_KEY`]
    const model = process.env[`LLM${key}_MODEL`]
    if (baseURL && apiKey && model) {
      models.push({
        id,
        label: process.env[`LLM${key}_LABEL`] || model,
        baseURL,
        apiKey,
        model,
        // 固定温度（可选）：某些模型只接受特定温度（如 kimi-k3 只允许 1）。
        // 配置后将忽略各 Agent 传入的温度，强制使用此值。
        fixedTemp:
          process.env[`LLM${key}_TEMPERATURE`] !== undefined
            ? Number(process.env[`LLM${key}_TEMPERATURE`])
            : undefined
      })
    }
  }

  // 主模型：由 LLM_PRIMARY 指定（填模型 id，如 llm4）。
  // 主模型会排到列表首位，前端默认以它为主，负责清洗 / 洞察 / 报告。
  const primaryId = process.env.LLM_PRIMARY
  if (primaryId) {
    const idx = models.findIndex((m) => m.id === primaryId)
    if (idx > 0) {
      const [primary] = models.splice(idx, 1)
      models.unshift(primary)
    }
  }
  return models
}

const MODELS = buildModels()
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT || 100000)

// 按 id 解析模型配置；未指定或找不到时回退到第一个可用模型。
function resolveModel(id) {
  if (id) {
    const found = MODELS.find((m) => m.id === id)
    if (found) return found
  }
  return MODELS[0]
}

const BOCHA = {
  apiKey: process.env.BOCHA_API_KEY,
  baseURL: process.env.BOCHA_BASE_URL || 'https://api.bochaai.com/v1/web-search',
  // 接口类型：web（默认，便宜、够用）| ai（带 AI 总结，较贵）
  mode: (process.env.BOCHA_MODE || 'web').toLowerCase()
}

// Anspire 安思派 AI 搜索（第二数据源，缓解单一搜索源问题）
const ANSPIRE = {
  apiKey: process.env.ANSPIRE_API_KEY,
  baseURL: process.env.ANSPIRE_BASE_URL || 'https://plugin.anspire.cn/api/ntsearch/search',
  // 检索区域：0 国内 / 1 海外 / 2 混合
  regionMode: Number(process.env.ANSPIRE_REGION_MODE || 0)
}

// 天行数据全网热搜榜
const TIANAPI = {
  key: process.env.TIANAPI_KEY,
  hotlistURL:
    process.env.TIANAPI_HOTLIST_URL || 'https://apis.tianapi.com/networkhot/index'
}

// MindSpider 爬虫桥（AgentMind 自带组件，可选启用）
// 环境要求：Python + MediaCrawler 子模块 + 平台登录态，详见 README。
const MINDSPIDER = {
  enabled: process.env.MINDSPIDER_ENABLED === 'true',
  platform: (process.env.MINDSPIDER_PLATFORM || 'weibo').toLowerCase(),
  python: process.env.MINDSPIDER_PYTHON || 'python'
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
    llm: MODELS.length > 0,
    models: MODELS.length,
    bocha: Boolean(BOCHA.apiKey),
    anspire: Boolean(ANSPIRE.apiKey),
    hotlist: Boolean(TIANAPI.key),
    mindspider: MINDSPIDER.enabled
  })
})

// ---------- 可用模型列表 ----------
// 前端据此渲染"参与协作的模型"选择器（仅暴露 id/label/model，不含密钥）。
app.get('/api/models', (req, res) => {
  res.json({
    models: MODELS.map((m) => ({ id: m.id, label: m.label, model: m.model }))
  })
})

// ---------- 账号体系（注册 / 登录 / 当前用户）----------

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {}
  const name = String(username || '').trim()
  const pwd = String(password || '')
  if (!USERNAME_RE.test(name)) {
    return res
      .status(400)
      .json({ error: '用户名需为 2-20 位字母/数字/下划线/中文。' })
  }
  if (pwd.length < 6 || pwd.length > 64) {
    return res.status(400).json({ error: '密码长度需为 6-64 位。' })
  }
  if (getUserByUsername(name)) {
    return res.status(409).json({ error: '用户名已存在，请更换。' })
  }
  const user = createUser(name, hashPassword(pwd))
  res.json({ token: signToken(user), user })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  const name = String(username || '').trim()
  const user = getUserByUsername(name)
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误。' })
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, username: user.username, createdAt: user.created_at }
  })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// ---------- 分析记录（登录用户）----------
// 完整分析结果（报告/图表数据/来源等）序列化后存 SQLite，支持回看。

app.get('/api/records', requireAuth, (req, res) => {
  res.json({ records: listRecords(req.user.id) })
})

app.get('/api/records/:id', requireAuth, (req, res) => {
  const record = getRecordById(req.user.id, Number(req.params.id))
  if (!record) {
    return res.status(404).json({ error: '记录不存在。' })
  }
  res.json({ record })
})

app.post('/api/records', requireAuth, (req, res) => {
  const { keyword, source = 'search', platform = '' } = req.body || {}
  const kw = String(keyword || '').trim()
  if (!kw) {
    return res.status(400).json({ error: '缺少 keyword。' })
  }
  const record = createRecord({ userId: req.user.id, keyword: kw, source, platform })
  res.json({ record })
})

// 步骤增量保存：流水线每完成一步，前端提交最新步骤态与流水线快照
app.patch('/api/records/:id/step', requireAuth, (req, res) => {
  const { stepState, pipeline } = req.body || {}
  const record = updateRecordStep({
    userId: req.user.id,
    recordId: Number(req.params.id),
    stepState,
    pipeline
  })
  if (!record) return res.status(404).json({ error: '记录不存在。' })
  res.json({ ok: true })
})

// 流程收尾：completed（写入完整结果）/ failed（保留流水线快照，可继续）
app.patch('/api/records/:id/finish', requireAuth, (req, res) => {
  const { status, result } = req.body || {}
  const st = status === 'failed' ? 'failed' : 'completed'
  let resultJson = null
  if (st === 'completed' && result && typeof result === 'object') {
    try {
      resultJson = result
    } catch {
      return res.status(400).json({ error: '分析结果序列化失败。' })
    }
  }
  if (st === 'completed' && !resultJson) {
    return res.status(400).json({ error: 'completed 状态需要 result。' })
  }
  const record = finishRecord({ userId: req.user.id, recordId: Number(req.params.id), status: st, result: resultJson })
  if (!record) return res.status(404).json({ error: '记录不存在。' })
  res.json({ ok: true, record: { id: record.id, status: record.status } })
})

app.delete('/api/records/:id', requireAuth, (req, res) => {
  deleteRecord(req.user.id, Number(req.params.id))
  res.json({ ok: true })
})

// ---------- 舆情采集：多源聚合（Bocha + Anspire）----------
// 同时调用已配置的搜索源，合并去重后返回，缓解「单一搜索源」问题。
// 任一源失败不影响其余源（Promise.allSettled）。
app.post('/api/collect', async (req, res) => {
  const { keyword, limit = 15, freshness = 'noLimit', source = 'search' } = req.body || {}
  const kw = String(keyword || '').trim()
  if (!kw) {
    return res.status(400).json({ error: '缺少 keyword 参数' })
  }

  const count = Math.min(Number(limit) || 15, 30)

  // ---- 数据源：MindSpider 真实爬虫（深度爬取）----
  // 前端传 source='mindspider' 时走此路径；默认仍为搜索 API 聚合。
  if (source === 'mindspider') {
    if (!MINDSPIDER.enabled) {
      return res.status(400).json({
        error:
          'MindSpider 数据源未启用：请在 .env 设置 MINDSPIDER_ENABLED=true，并完成 Python 依赖与平台登录（详见 README「MindSpider 爬虫接入」）。'
      })
    }
    try {
      const crawled = await crawlBySpider({
        platform: req.body.platform || MINDSPIDER.platform,
        keyword: kw,
        maxNotes: count
      })
      if (!crawled?.texts?.length) {
        return res.status(404).json({ error: `MindSpider 未爬取到「${kw}」的内容` })
      }
      return res.json({
        texts: crawled.texts,
        sources: crawled.sources || [],
        aiSummary: '',
        providers: [{ provider: `mindspider:${req.body.platform || MINDSPIDER.platform}`, ok: true, count: crawled.texts.length }]
      })
    } catch (err) {
      return res.status(502).json({ error: err.message || 'MindSpider 爬取失败' })
    }
  }

  const query = `${kw} 舆情 评价 讨论`

  // 组装可用搜索源任务
  const tasks = []
  if (BOCHA.apiKey) {
    const searchFn = BOCHA.mode === 'ai' ? bochaSearch : bochaWebSearch
    tasks.push({
      provider: 'bocha',
      run: () =>
        searchFn({
          apiKey: BOCHA.apiKey,
          baseURL: BOCHA.baseURL,
          query,
          count,
          answer: false,
          freshness
        })
    })
  }
  if (ANSPIRE.apiKey) {
    tasks.push({
      provider: 'anspire',
      run: () =>
        anspireSearch({
          apiKey: ANSPIRE.apiKey,
          baseURL: ANSPIRE.baseURL,
          query,
          count,
          regionMode: ANSPIRE.regionMode
        })
    })
  }

  if (tasks.length === 0) {
    return res.status(500).json({
      error: '服务端未配置任何搜索源（请在 .env 填写 BOCHA_API_KEY 或 ANSPIRE_API_KEY）。'
    })
  }

  try {
    const settled = await Promise.allSettled(tasks.map((t) => t.run()))

    const items = []
    const sources = []
    const seen = new Set()
    const providerStats = []
    let aiSummary = ''
    const errors = []

    settled.forEach((s, i) => {
      const provider = tasks[i].provider
      if (s.status === 'fulfilled') {
        const { webpages = [], answer } = s.value || {}
        if (answer && !aiSummary) aiSummary = answer
        let added = 0
        for (const w of webpages) {
          const title = stripHtml(w.name)
          const snippet = stripHtml(w.snippet)
          const text = snippet ? `${title}。${snippet}` : title
          // 去重：按正文文本 + URL 双重判断
          const dedupeKey = `${text}|${w.url || ''}`
          if (!text || seen.has(dedupeKey)) continue
          seen.add(dedupeKey)
          items.push(text)
          sources.push({
            title,
            url: w.url,
            displayUrl: w.displayUrl,
            date: w.datePublished,
            provider
          })
          added++
        }
        providerStats.push({ provider, ok: true, count: added })
      } else {
        errors.push(`${provider}: ${s.reason?.message || '采集失败'}`)
        providerStats.push({ provider, ok: false, error: s.reason?.message })
      }
    })

    if (items.length === 0) {
      const detail = errors.length ? `（${errors.join('；')}）` : ''
      return res.status(404).json({
        error: `未检索到「${kw}」的相关舆情，请更换关键词或稍后重试。${detail}`
      })
    }

    res.json({ texts: items, sources, aiSummary, providers: providerStats })
  } catch (err) {
    res.status(502).json({ error: err.message || '舆情采集失败' })
  }
})

// ---------- 全网热搜榜（天行数据）----------
app.get('/api/hotlist', async (req, res) => {
  if (!TIANAPI.key) {
    return res
      .status(500)
      .json({ error: '服务端未配置 TIANAPI_KEY（请在 .env 填写天行数据密钥）。' })
  }
  try {
    const list = await fetchHotList({ apiKey: TIANAPI.key, baseURL: TIANAPI.hotlistURL })
    res.json({ list })
  } catch (err) {
    res.status(502).json({ error: err.message || '热搜榜获取失败' })
  }
})

// ---------- MindSpider 爬虫桥（真实爬虫）----------
// 13 平台聚合热搜：纯 HTTP，无数据库/浏览器依赖，可随时调用。
app.get('/api/mindspider/hotlist', async (req, res) => {
  try {
    const data = await fetchHotListBySpider()
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message || 'MindSpider 热搜获取失败' })
  }
})

// MindSpider 环境自检：Python / mindspider 组件 / MediaCrawler 子模块状态。
app.get('/api/mindspider/status', async (req, res) => {
  try {
    const info = await checkMindSpiderEnv()
    res.json({ ...info, enabled: MINDSPIDER.enabled, platform: MINDSPIDER.platform })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// ---------- 爬虫后台任务队列（生产「无感」爬取）----------
// 提交任务立即返回 jobId，后台单工执行，前端轮询状态、完成后接续流水线。

const CRAWL_PLATFORMS = ['weibo', 'wb', 'xhs', 'dy', 'ks', 'bili', 'tieba', 'zhihu']

app.post('/api/crawl/job', requireAuth, (req, res) => {
  const { keyword, platform, maxNotes = 20 } = req.body || {}
  const kw = String(keyword || '').trim()
  const pf = String(platform || MINDSPIDER.platform).toLowerCase()
  if (!kw) return res.status(400).json({ error: '缺少 keyword。' })
  if (!CRAWL_PLATFORMS.includes(pf)) {
    return res.status(400).json({ error: `不支持的平台：${pf}（weibo/xhs/dy/ks/bili/tieba/zhihu）` })
  }
  if (!MINDSPIDER.enabled) {
    return res.status(400).json({
      error: 'MindSpider 数据源未启用：请在 .env 设置 MINDSPIDER_ENABLED=true（详见 README「MindSpider 爬虫接入」）。'
    })
  }
  const job = createCrawlJob({
    keyword: kw,
    platform: pf,
    maxNotes: Math.min(Number(maxNotes) || 20, 100)
  })
  res.json({
    job: {
      id: job.id,
      keyword: job.keyword,
      platform: job.platform,
      status: job.status,
      progress: job.progress
    },
    queue: getCrawlQueueStatus()
  })
})

app.get('/api/crawl/job/:id', requireAuth, (req, res) => {
  const job = getCrawlJob(Number(req.params.id))
  if (!job) return res.status(404).json({ error: '任务不存在。' })
  res.json({
    job: {
      id: job.id,
      keyword: job.keyword,
      platform: job.platform,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.status === 'completed' ? job.result : null,
      error: job.status === 'failed' ? job.error : null
    }
  })
})

app.get('/api/crawl/status', requireAuth, (req, res) => {
  res.json(getCrawlQueueStatus())
})

// ---------- LLM 代理 ----------
app.post('/api/llm', async (req, res) => {
  const { system, user, json = false, temperature, model: modelId } = req.body || {}

  const m = resolveModel(modelId)
  if (!m) {
    return res
      .status(500)
      .json({ error: '服务端未配置任何 LLM（请检查 .env 的 LLM_*）。' })
  }

  const body = {
    model: m.model,
    temperature: m.fixedTemp ?? temperature ?? 0.7,
    messages: [
      { role: 'system', content: system || '' },
      { role: 'user', content: user || '' }
    ]
  }
  if (json) body.response_format = { type: 'json_object' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT)

  try {
    const r = await fetch(m.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${m.apiKey}`
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
    res.json({ content: content.trim(), model: m.id, label: m.label })
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: `LLM 调用超时（>${LLM_TIMEOUT / 1000}s）` })
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
  const { system, user, temperature, model: modelId } = req.body || {}

  const m = resolveModel(modelId)
  if (!m) {
    return res
      .status(500)
      .json({ error: '服务端未配置任何 LLM（请检查 .env 的 LLM_*）。' })
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
    model: m.model,
    temperature: m.fixedTemp ?? temperature ?? 0.7,
    stream: true,
    messages: [
      { role: 'system', content: system || '' },
      { role: 'user', content: user || '' }
    ]
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT)

  try {
    const r = await fetch(m.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${m.apiKey}`
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
        ? `LLM 调用超时（>${LLM_TIMEOUT / 1000}s）`
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
  console.log(`   LLM   配置: ${MODELS.length ? `✓ ${MODELS.length} 个模型（${MODELS.map((m) => m.label).join('、')}）` : '✗ 缺失'}`)
  console.log(`   Bocha 配置: ${BOCHA.apiKey ? '✓' : '✗ 缺失'}`)
  console.log(`   Anspire 配置: ${ANSPIRE.apiKey ? '✓' : '✗ 缺失'}`)
  console.log(`   热搜  配置: ${TIANAPI.key ? '✓' : '✗ 缺失'}\n`)
})
