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
 * 论坛协作（ForumEngine）配置
 * ---------------------------------------------------
 * 参考 BettaFish 的 ForumEngine：在「分析/洞察」之后，引入一个
 * 「主持人」模型主持多轮论坛——各验证模型轮流发言复核，主持人
 * 归纳共识/分歧、提出追问，驱动结论多轮收敛，最终可溯源。
 * - enabled: 为 true 时以多轮论坛取代单轮交叉验证；
 * - rounds:  论坛轮数（建议 2-3 轮，过多会增加耗时与成本）。
 */
export const FORUM_CONFIG = {
  enabled: true,
  rounds: 2
}

/**
 * 本地情感中间件配置
 * ---------------------------------------------------
 * 参考 BettaFish「LLM + 本地情感模型复合分析」思路：用纯 JS 中文情感词典
 * 对清洗后的文本做一次本地情感分析，作为「校准锚点」与 LLM 结果按权重融合，
 * 降低 LLM 情感占比的波动、提升稳健性（零成本、瞬时、不消耗 token）。
 * - enabled: 是否启用本地情感融合；
 * - weight:  本地结果在融合中的权重（0-1），0.3 表示 LLM 占 70%、本地占 30%。
 */
export const LOCAL_SENTIMENT_CONFIG = {
  enabled: true,
  weight: 0.3
}

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

