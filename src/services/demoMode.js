import { useEffect, useState } from 'react'
import { DEMO_CONFIG } from '../config.js'

/**
 * demoMode.js —— 离线演示模式开关（全局状态）
 * ---------------------------------------------------
 * 离线演示模式用于「无网络 / 未配置密钥」环境下完整展示产品流程：
 * 开启后，采集、清洗、分析、洞察、论坛、报告、热搜、模型列表等所有
 * 原本依赖后端与外部 API 的调用，全部由本地预置的演示数据模拟返回，
 * 不发起任何网络请求，流水线动画与图表 / 报告 / 导出照常运行。
 *
 * 设计：模块级状态 + localStorage 持久化 + 轻量订阅，供 React 组件与
 * 各服务层（llmService / collectService / hotlistService）共享读取。
 */

const STORAGE_KEY = 'agentmind.demoMode'

/** 读取初始状态：localStorage 优先，回落到 config 默认值 */
function readInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return !!DEMO_CONFIG.defaultEnabled
}

let enabled = readInitial()
const listeners = new Set()

/** 当前是否处于离线演示模式 */
export function isDemoMode() {
  return enabled
}

/** 设置离线演示模式，并持久化 + 通知订阅者 */
export function setDemoMode(next) {
  const value = !!next
  if (value === enabled) return
  enabled = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* 忽略持久化失败 */
  }
  listeners.forEach((cb) => {
    try {
      cb(enabled)
    } catch {
      /* 单个订阅者异常不影响其余 */
    }
  })
}

/** 订阅离线模式变化，返回取消订阅函数 */
export function subscribeDemoMode(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * React Hook：读取并切换离线演示模式。
 * @returns {[boolean, (next:boolean)=>void]}
 */
export function useDemoMode() {
  const [state, setState] = useState(enabled)
  useEffect(() => subscribeDemoMode(setState), [])
  return [state, setDemoMode]
}
