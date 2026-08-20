/**
 * server/mindspider.js —— MindSpider 爬虫桥（Node 侧）
 * ---------------------------------------------------
 * 通过 child_process 调起 Python 桥接脚本 server/mindspider_bridge.py，
 * 复用 AgentMind 自带组件 mindspider/（源自 BettaFish 的 MindSpider 模块，
 * Apache-2.0 许可）的既有爬虫能力，与 BettaFish 仓库本身无运行时关系：
 *   - fetchHotListBySpider(): 13 平台聚合热搜（纯 HTTP，无需数据库/登录）
 *   - crawlBySpider():       深度爬虫采集（Playwright/MediaCrawler，
 *                            需要子模块、Python 依赖与平台登录态）
 *
 * Python 环境可通过 MINDSPIDER_PYTHON 环境变量指定（默认 "python"）。
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BRIDGE_SCRIPT = path.join(__dirname, 'mindspider_bridge.py')
const PYTHON = process.env.MINDSPIDER_PYTHON || 'python'

/** 剥离终端 ANSI 转义序列（loguru 等彩色日志输出会污染错误消息） */
function stripAnsi(text = '') {
  // eslint-disable-next-line no-control-regex
  return String(text).replace(/\x1b\[[0-9;]*m/g, '')
}

/** 运行桥接脚本，返回解析后的 JSON 结果 */
function runBridge(args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [BRIDGE_SCRIPT, ...args], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      reject(new Error(`MindSpider 桥接超时（>${Math.round(timeoutMs / 1000)}s）`))
    }, timeoutMs)

    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(
        new Error(
          `无法启动 Python（${PYTHON}）：${err.message}。请确认已安装 Python 并可用（或用 MINDSPIDER_PYTHON 指定解释器）。`
        )
      )
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code === 0) {
        try {
          // 桥接脚本约定：最后一行输出结果 JSON
          const lines = stripAnsi(stdout).trim().split(/\r?\n/).filter(Boolean)
          const last = lines[lines.length - 1] || '{}'
          const data = JSON.parse(last)
          if (data.error) {
            reject(new Error(data.error))
            return
          }
          resolve(data)
        } catch (err) {
          reject(new Error(`MindSpider 桥接输出解析失败：${err.message}。原始输出：${stdout.slice(-500)}`))
        }
      } else {
        // 桥接脚本失败时会在 stdout 最后一行输出 {"error": ...}；
        // 优先使用该结构化错误，缺失时才回退 stderr 日志尾部。
        let jsonError = ''
        try {
          const lines = stripAnsi(stdout).trim().split(/\r?\n/).filter(Boolean)
          const parsed = JSON.parse(lines[lines.length - 1] || '{}')
          if (parsed?.error) jsonError = parsed.error
        } catch {
          /* 忽略：stdout 不是 JSON */
        }
        const detail =
          jsonError ||
          stripAnsi(stderr).trim().slice(-600) ||
          stripAnsi(stdout).trim().slice(-600)
        reject(new Error(detail || `MindSpider 桥接执行失败（退出码 ${code}）`))
      }
    })
  })
}

/**
 * 13 平台聚合热搜（BroadTopicExtraction.NewsCollector）。
 * @param {string[]} [sources] 限定平台 id（如 ['weibo','zhihu']），缺省全部
 * @returns {Promise<{list:Array<{title,hotnum,url,platform,source_id}>}>}
 */
export async function fetchHotListBySpider(sources) {
  const args = ['hotlist']
  if (Array.isArray(sources) && sources.length > 0) args.push('--sources', ...sources)
  return runBridge(args, { timeoutMs: 90000 })
}

/**
 * 深度爬虫采集（DeepSentimentCrawling.PlatformCrawler + MediaCrawler）。
 * @param {Object} params
 * @param {string} params.platform 平台：weibo/wb|xhs|dy|ks|bili|tieba|zhihu
 * @param {string} params.keyword  采集关键词
 * @param {number} [params.maxNotes] 最大条数（默认 20）
 * @returns {Promise<{texts:string[], sources:Array}>}
 */
export async function crawlBySpider({ platform, keyword, maxNotes = 20 }) {
  // 平台别名：MediaCrawler 内部代码是 wb（微博），对外同时接受 weibo/wb
  const PLATFORM_ALIAS = {
    weibo: 'wb',
    wb: 'wb',
    xhs: 'xhs',
    dy: 'dy',
    ks: 'ks',
    bili: 'bili',
    tieba: 'tieba',
    zhihu: 'zhihu'
  }
  const platformId = PLATFORM_ALIAS[String(platform || '').trim().toLowerCase()]
  const kw = String(keyword || '').trim()
  if (!platformId || !kw) {
    throw new Error(
      'MindSpider 采集需要 platform 与 keyword 参数（平台：weibo/xhs/dy/ks/bili/tieba/zhihu）。'
    )
  }
  // 爬虫为浏览器自动化 + 登录，单次耗时长，给足超时
  return runBridge(['crawl', platformId, kw, String(Math.min(Number(maxNotes) || 20, 100))], {
    timeoutMs: 30 * 60 * 1000
  })
}

/**
 * MindSpider 环境自检：Python 环境与 MindSpider 组件是否就绪。
 * MindSpider 位置解析：优先 .env 的 MINDSPIDER_ROOT，缺省 AgentMind/mindspider
 * （与 Python 桥接脚本一致；spawn 默认继承 process.env，无需额外传递）。
 * @returns {Promise<{ok:boolean, python:string, mindspider:string, mediaCrawler:boolean}>}
 */
export async function checkMindSpiderEnv() {
  const mindspiderRoot =
    process.env.MINDSPIDER_ROOT?.trim().replace(/^"|"$/g, '') ||
    path.join(__dirname, '..', 'mindspider')
  const info = {
    python: PYTHON,
    mindspider: mindspiderRoot,
    mediaCrawler: false,
    ok: false
  }
  try {
    // 用桥接的 ping 子命令探测：解释器可用性 + 组件位置（不联网、不 import 重模块）
    const ping = await runBridge(['ping'], { timeoutMs: 15000 })
    info.ok = ping?.ok === true
    if (ping?.mindspider) info.mindspider = ping.mindspider
    if (ping?.python) info.python = ping.python
  } catch {
    info.ok = false
  }
  const fs = await import('node:fs')
  info.mediaCrawler = fs.existsSync(
    path.join(info.mindspider, 'DeepSentimentCrawling', 'MediaCrawler', 'main.py')
  )
  return info
}
