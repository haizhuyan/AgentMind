import axios from 'axios'
import { API_BASE } from '../config.js'
import { isDemoMode } from './demoMode.js'
import { DEMO_HOTLIST } from './demoData.js'

/**
 * hotlistService.js —— 全网热搜榜（后端代理）
 * ---------------------------------------------------
 * 前端通过 /api/hotlist 获取实时热搜，密钥仅后端持有。
 */

/**
 * 拉取全网热搜榜单。
 * @returns {Promise<Array<{title:string, digest:string, hotnum:number}>>}
 */
export async function fetchHotList() {
  // 离线演示模式：返回本地预置热搜榜，不发起网络请求
  if (isDemoMode()) {
    return DEMO_HOTLIST
  }
  try {
    const res = await axios.get(`${API_BASE}/hotlist`, { timeout: 15000 })
    const list = res?.data?.list
    return Array.isArray(list) ? list : []
  } catch (err) {
    const backendMsg = err?.response?.data?.error
    throw new Error(backendMsg || err.message || '热搜榜获取失败')
  }
}
