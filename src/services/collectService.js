import axios from 'axios'
import { API_BASE, COLLECT_CONFIG } from '../config.js'
import { isDemoMode } from './demoMode.js'
import { demoCollect } from './demoData.js'

/**
 * collectService.js —— 真实舆情数据采集服务（后端代理）
 * ---------------------------------------------------
 * 采集逻辑已迁移到后端（server/index.js），通过 Bocha 博查 AI 搜索
 * 按关键词真实检索全网舆情。前端仅调用 /api/collect 消费结果。
 *
 * 参考 BettaFish 的 QueryEngine/MediaEngine：以 AI 联网搜索作为数据入口。
 */

/**
 * 按关键词采集真实舆情文本与来源。
 * @param {string} keyword
 * @returns {Promise<{texts:string[], sources:Array, aiSummary:string}>}
 */
export async function collectReal(keyword) {
  // 离线演示模式：返回本地预置舆情样本，不发起网络请求
  if (isDemoMode()) {
    return demoCollect(keyword)
  }
  try {
    const res = await axios.post(
      `${API_BASE}/collect`,
      {
        keyword,
        limit: COLLECT_CONFIG.limit,
        freshness: COLLECT_CONFIG.freshness
      },
      { timeout: 40000 }
    )

    const { texts, sources, aiSummary } = res.data || {}
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('后端未返回舆情文本')
    }
    return { texts, sources: sources || [], aiSummary: aiSummary || '' }
  } catch (err) {
    const backendMsg = err?.response?.data?.error
    if (backendMsg) throw new Error(backendMsg)
    if (err.code === 'ECONNABORTED') {
      throw new Error('采集超时，请重试或缩短采集条数。')
    }
    if (err.message?.includes('Network Error')) {
      throw new Error('无法连接后端服务，请先运行 `npm run server` 或 `npm run dev:all`。')
    }
    throw new Error(err.message || 'Bocha 采集失败')
  }
}
