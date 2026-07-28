import axios from 'axios'
import { API_BASE } from '../config.js'

/**
 * llmService.js —— 大模型调用（后端代理）
 * ---------------------------------------------------
 * LLM 密钥已迁移到后端（server/index.js），前端不再持有密钥。
 * 所有智能体通过 /api/llm 由后端转发到大模型接口。
 */

/**
 * 调用大模型对话接口（经后端代理）
 * @param {Object} params
 * @param {string} params.system   系统提示词，用于设定 Agent 角色
 * @param {string} params.user     用户内容（待处理的数据）
 * @param {boolean} [params.json]  是否要求返回 JSON 格式
 * @param {number} [params.temperature] 采样温度
 * @param {string} [params.model]  模型 id（多模型时指定由哪个模型执行；缺省用后端默认）
 * @returns {Promise<string>} 模型返回的文本内容
 */
export async function callLLM({ system, user, json = false, temperature, model }) {
  try {
    const res = await axios.post(
      `${API_BASE}/llm`,
      { system, user, json, temperature, model },
      { timeout: 180000, headers: { 'Content-Type': 'application/json' } }
    )

    const content = res?.data?.content
    if (!content) {
      throw new Error('模型返回内容为空')
    }
    return content.trim()
  } catch (err) {
    const backendMsg = err?.response?.data?.error
    if (backendMsg) throw new Error(backendMsg)
    if (err.code === 'ECONNABORTED') {
      throw new Error('LLM 调用超时，请重试。')
    }
    if (err.message?.includes('Network Error')) {
      throw new Error('无法连接后端服务，请先运行 `npm run server` 或 `npm run dev:all`。')
    }
    throw new Error(`LLM 调用异常：${err.message}`)
  }
}

/**
 * 流式调用大模型（经后端 SSE 代理），实时回传 token 与思考过程。
 * @param {Object} params
 * @param {string} params.system
 * @param {string} params.user
 * @param {number} [params.temperature]
 * @param {(text:string)=>void} [params.onToken]     正文 token 回调
 * @param {(text:string)=>void} [params.onReasoning] 思考链（deepseek-reasoner）回调
 * @param {string} [params.model] 模型 id
 * @returns {Promise<string>} 完整正文
 */
export async function callLLMStream({ system, user, temperature, onToken, onReasoning, model }) {
  const res = await fetch(`${API_BASE}/llm/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user, temperature, model })
  })

  if (!res.ok || !res.body) {
    let msg = `LLM 流式调用失败（HTTP ${res.status}）`
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let full = ''
  let errorMsg = ''

  // 解析 SSE：event: xxx\ndata: {...}\n\n
  const handleEvent = (event, dataStr) => {
    let data
    try {
      data = JSON.parse(dataStr)
    } catch {
      return
    }
    if (event === 'token') {
      full += data.text || ''
      onToken?.(data.text || '')
    } else if (event === 'reasoning') {
      onReasoning?.(data.text || '')
    } else if (event === 'done') {
      if (data.content) full = data.content
    } else if (event === 'error') {
      errorMsg = data.error || 'LLM 流式调用异常'
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      let event = 'message'
      let dataStr = ''
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
      }
      if (dataStr) handleEvent(event, dataStr)
    }
  }

  if (errorMsg) throw new Error(errorMsg)
  return full.trim()
}

/**
 * 安全解析 LLM 返回的 JSON。
 * 兼容模型偶尔携带 ```json 代码块包裹的情况。
 * @param {string} text
 * @returns {Object}
 */
export function parseJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    // 尝试提取被代码块包裹的 JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        throw new Error('数据解析异常，请重试')
      }
    }
    throw new Error('数据解析异常，请重试')
  }
}

/**
 * 获取后端已配置的可用模型列表（用于前端"参与协作的模型"选择器）。
 * @returns {Promise<Array<{id:string, label:string, model:string}>>}
 */
export async function fetchModels() {
  try {
    const res = await axios.get(`${API_BASE}/models`, { timeout: 8000 })
    const models = res?.data?.models
    return Array.isArray(models) ? models : []
  } catch {
    return []
  }
}
