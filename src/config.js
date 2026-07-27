/**
 * 前端全局配置
 * ---------------------------------------------------
 * 所有密钥已迁移到后端（server/）+ 根目录 .env，前端不再持有任何密钥。
 * 前端仅通过 /api 访问本地 Node 后端（见 vite.config.js 代理与 server/index.js）。
 */

// 后端 API 基址（开发环境经 Vite 代理转发到 http://localhost:3100）
export const API_BASE = '/api'

// 是否启用多智能体辩论/交叉验证机制
export const ENABLE_DEBATE = true

/**
 * 采集配置
 * ---------------------------------------------------
 * 真实舆情采集由后端通过 Bocha 博查 AI 搜索完成（server/index.js）。
 * mode 保留为 'bocha'，参数仅控制采集条数与时间范围。
 */
export const COLLECT_CONFIG = {
  mode: 'bocha',

  // 采集条数上限（Bocha 返回的网页结果数，最大 30）
  limit: 15,

  // 时间范围：oneDay / oneWeek / oneMonth / oneYear / noLimit
  freshness: 'noLimit'
}

