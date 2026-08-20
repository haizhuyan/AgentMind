/**
 * server/crawlQueue.js —— MindSpider 爬虫后台任务队列
 * ---------------------------------------------------
 * 生产环境「无感」爬取的关键：
 *   提交任务（立即返回任务 id）→ 单工队列后台执行 → 前端轮询/完成后通知。
 *
 * 设计：
 *   - 进程内队列（单实例部署够用；多实例请替换为 Redis/BullMQ）
 *   - 并发 = 1：同一时间只启动一个浏览器实例，避免资源争抢与平台风控
 *   - 任务状态机：queued → running → completed / failed
 *   - 结果（texts/sources）暂存内存；服务重启后任务丢失，
 *     前端以「记录（records）」为准持久化最终分析结果。
 */

import { crawlBySpider } from './mindspider.js'

const jobs = new Map() // id -> job
const queue = [] // 排队中的 job id
let seq = 0
let runningId = null

export function createCrawlJob({ keyword, platform, maxNotes }) {
  const id = ++seq
  const job = {
    id,
    keyword,
    platform,
    maxNotes,
    status: 'queued',
    progress: '等待执行',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result: null,
    error: null
  }
  jobs.set(id, job)
  queue.push(id)
  processQueue()
  return job
}

export function getCrawlJob(id) {
  return jobs.get(id) || null
}

export function getCrawlQueueStatus() {
  return {
    running: runningId != null ? publicJob(jobs.get(runningId)) : null,
    queued: queue.map((id) => publicJob(jobs.get(id))).filter(Boolean),
    total: jobs.size
  }
}

/** 对外暴露的公开字段（不含内部引用） */
function publicJob(job) {
  if (!job) return null
  return {
    id: job.id,
    keyword: job.keyword,
    platform: job.platform,
    maxNotes: job.maxNotes,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    // 仅在完成后返回结果，避免轮询传输过大
    result: job.status === 'completed' ? job.result : null,
    error: job.status === 'failed' ? job.error : null
  }
}

/** 单工调度：一次只跑一个任务 */
async function processQueue() {
  if (runningId != null) return
  const id = queue.shift()
  if (id == null) return
  const job = jobs.get(id)
  if (!job) {
    processQueue()
    return
  }
  runningId = id
  job.status = 'running'
  job.progress = '爬虫执行中（后台无头模式）'
  job.updatedAt = Date.now()
  try {
    const result = await crawlBySpider({
      platform: job.platform,
      keyword: job.keyword,
      maxNotes: job.maxNotes
    })
    job.result = result
    job.progress = `完成，共 ${result?.texts?.length || 0} 条样本`
    job.status = 'completed'
  } catch (err) {
    job.error = err.message || '爬取失败'
    job.progress = '失败'
    job.status = 'failed'
  } finally {
    job.updatedAt = Date.now()
    runningId = null
    processQueue() // 继续下一个任务
  }
}
