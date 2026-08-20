/**
 * api.js —— 账号与记录 API（axios 封装）
 * ---------------------------------------------------
 * token 存 localStorage（agentmind_token），请求自动携带；
 * 401 时清除本地登录态并触发 onUnauthorized 回调（跳回登录页）。
 */

import axios from 'axios'
import { API_BASE } from '../config.js'

const TOKEN_KEY = 'agentmind_token'

let onUnauthorized = null

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handle401(err) {
  if (err?.response?.status === 401) {
    setToken('')
    onUnauthorized?.()
  }
  return Promise.reject(err)
}

function extractError(err, fallback) {
  const backendMsg = err?.response?.data?.error
  if (backendMsg) return new Error(backendMsg)
  if (err.message?.includes('Network Error')) {
    return new Error('无法连接后端服务，请确认后端已启动。')
  }
  return new Error(err.message || fallback)
}

/** ---------- 账号 ---------- */

export async function apiRegister(username, password) {
  try {
    const res = await axios.post(`${API_BASE}/auth/register`, { username, password })
    return res.data
  } catch (err) {
    throw extractError(err, '注册失败')
  }
}

export async function apiLogin(username, password) {
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
    return res.data
  } catch (err) {
    throw extractError(err, '登录失败')
  }
}

export async function apiMe() {
  try {
    const res = await axios.get(`${API_BASE}/auth/me`, { headers: authHeaders() })
    return res.data
  } catch (err) {
    return handle401(err)
  }
}

/** ---------- 分析记录 ---------- */

export async function apiListRecords() {
  try {
    const res = await axios.get(`${API_BASE}/records`, { headers: authHeaders() })
    return res.data?.records || []
  } catch (err) {
    return handle401(err)
  }
}

export async function apiGetRecord(id) {
  try {
    const res = await axios.get(`${API_BASE}/records/${id}`, { headers: authHeaders() })
    return res.data?.record || null
  } catch (err) {
    return handle401(err)
  }
}

export async function apiSaveRecord({ keyword, source, platform, result }) {
  try {
    const res = await axios.post(
      `${API_BASE}/records`,
      { keyword, source, platform, result },
      { headers: authHeaders(), timeout: 30000 }
    )
    return res.data?.record || null
  } catch (err) {
    return handle401(err)
  }
}

/** 创建对话记录（status=running），返回记录（含 id） */
export async function apiCreateRecord({ keyword, source, platform }) {
  try {
    const res = await axios.post(
      `${API_BASE}/records`,
      { keyword, source, platform },
      { headers: authHeaders(), timeout: 15000 }
    )
    return res.data?.record || null
  } catch (err) {
    return handle401(err)
  }
}

/** 增量保存步骤状态与流水线快照（断点续跑） */
export async function apiUpdateRecordStep(id, { stepState, pipeline }) {
  try {
    const res = await axios.patch(
      `${API_BASE}/records/${id}/step`,
      { stepState, pipeline },
      { headers: authHeaders(), timeout: 30000 }
    )
    return res.data
  } catch (err) {
    return handle401(err)
  }
}

/** 流程收尾：completed（写入完整结果）/ failed（保留快照可继续） */
export async function apiFinishRecord(id, status, result) {
  try {
    const res = await axios.patch(
      `${API_BASE}/records/${id}/finish`,
      { status, result },
      { headers: authHeaders(), timeout: 30000 }
    )
    return res.data
  } catch (err) {
    return handle401(err)
  }
}

/** ---------- 爬虫后台任务队列 ---------- */

/** 提交爬虫任务（立即返回 jobId，后台执行） */
export async function apiCreateCrawlJob({ keyword, platform, maxNotes }) {
  try {
    const res = await axios.post(
      `${API_BASE}/crawl/job`,
      { keyword, platform, maxNotes },
      { headers: authHeaders(), timeout: 15000 }
    )
    return res.data?.job || null
  } catch (err) {
    return handle401(err)
  }
}

/** 查询爬虫任务状态（completed 时携带结果） */
export async function apiGetCrawlJob(id) {
  try {
    const res = await axios.get(`${API_BASE}/crawl/job/${id}`, {
      headers: authHeaders(),
      timeout: 15000
    })
    return res.data?.job || null
  } catch (err) {
    return handle401(err)
  }
}

export async function apiDeleteRecord(id) {
  try {
    const res = await axios.delete(`${API_BASE}/records/${id}`, { headers: authHeaders() })
    return res.data
  } catch (err) {
    return handle401(err)
  }
}
