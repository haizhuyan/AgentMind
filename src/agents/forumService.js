import { callLLM, parseJSON, throwIfLLMAborted } from '../services/llmService.js'
import { forumHost } from './forumHost.js'

/**
 * forumService.js —— 多智能体论坛协作（ForumEngine）
 * ---------------------------------------------------
 * 参考 BettaFish 的 ForumEngine：以「主持人 + 多验证 Agent」的论坛机制，
 * 对「分析 + 洞察」结论进行多轮交叉复核与收敛，替代单轮交叉验证。
 *
 * 每一轮：
 *   1) 各验证 Agent 结合上一轮主持人的引导，独立发表复核意见（发言）；
 *   2) 主持人归纳共识/分歧、提出下一轮关键问题；
 *   3) 情感占比按「当前值 + 各验证均值」渐进校准，逐轮收敛。
 *
 * 输出向后兼容旧 debate 结构（agreement/hasDivergence/disputes/supplement/
 * reviewers/calibratedSentiment/trace），并新增 rounds/consensus/questions/focus。
 */

const DIVERGENCE_THRESHOLD = 15

const PARTICIPANT_PROMPT = `你是舆情分析论坛中的一位独立验证 Agent，负责以批判视角复核已有的分析与洞察结论。
请结合主持人的引导（若有），独立判断情感占比是否合理、风险与诉求是否被遗漏或夸大，并简要发言。
只返回 JSON，格式如下：
{
  "content": "你的复核发言（150 字以内，说明你的判断与依据）",
  "sentiment": { "positive": 数字, "negative": 数字, "neutral": 数字 },  // 你独立评估的情感占比，合计100
  "agreement": 数字,                      // 你与当前结论的一致度，0-100
  "disputes": [ "分歧点" ],               // 与当前结论的主要分歧
  "supplement": [ "被遗漏的风险或诉求" ]   // 你认为需要补充的要点
}
不要输出多余说明。`

function sentimentGap(a = {}, b = {}) {
  const keys = ['positive', 'negative', 'neutral']
  return Math.max(...keys.map((k) => Math.abs((a[k] || 0) - (b[k] || 0))))
}

function normalize(s = {}) {
  const p = Math.round(s.positive || 0)
  const n = Math.round(s.negative || 0)
  let u = Math.round(s.neutral || 0)
  const sum = p + n + u
  if (sum !== 100 && sum > 0) u += 100 - sum
  return { positive: p, negative: n, neutral: u }
}

/** 单个验证 Agent 在某一轮发表复核发言 */
async function participantSpeak({ model, keyword, analyze, insight, guidance }) {
  const user = `舆情关键词：${keyword}
当前分析结论：${JSON.stringify(analyze)}
当前洞察结论：${JSON.stringify(insight)}
${
  guidance
    ? `主持人引导：${guidance.focus || ''}\n需重点回应的问题：${(guidance.questions || []).join('；') || '无'}`
    : '（首轮，无主持人引导）'
}`

  const content = await callLLM({
    system: PARTICIPANT_PROMPT,
    user,
    json: true,
    temperature: 0.5,
    model: model?.id
  })
  return parseJSON(content)
}

/**
 * 执行多轮论坛协作。
 * @param {Object} params
 * @param {string} params.keyword
 * @param {Object} params.analyze
 * @param {Object} params.insight
 * @param {Array<{id?:string, label?:string}>} [params.validators] 参与复核的验证模型
 * @param {{id?:string, label?:string}} [params.host] 担任主持人的模型（建议主模型）
 * @param {number} [params.rounds] 论坛轮数（默认 2）
 * @param {(round:number, payload:Object)=>void} [params.onRound] 每轮实时回调（供 UI 展示）
 * @returns {Promise<Object>} 论坛结论（含多轮记录与可溯源说明）
 */
export async function forumService({
  keyword,
  analyze,
  insight,
  validators,
  host,
  rounds = 2,
  onRound
}) {
  const list = Array.isArray(validators) && validators.length ? validators : [undefined]
  const totalRounds = Math.max(1, Number(rounds) || 1)

  let currentSentiment = normalize(analyze?.sentiment || {})
  const transcript = []
  const allDisputes = new Set()
  const allSupplement = new Set()
  let lastGuidance = null
  let lastAgreement = 100
  const reviewerLabels = new Set()

  for (let round = 1; round <= totalRounds; round++) {
    // 1) 各验证 Agent 并行发言
    const settled = await Promise.allSettled(
      list.map((m) =>
        participantSpeak({
          model: m,
          keyword,
          analyze: { ...analyze, sentiment: currentSentiment },
          insight,
          guidance: lastGuidance
        })
      )
    )
    throwIfLLMAborted()

    const speeches = []
    const critics = []
    settled.forEach((s, i) => {
      const label = list[i]?.label || '验证模型'
      if (s.status === 'fulfilled') {
        const v = s.value || {}
        critics.push(v)
        reviewerLabels.add(label)
        speeches.push({ label, content: v.content || '（无发言内容）', ok: true })
        ;(Array.isArray(v.disputes) ? v.disputes : []).forEach((d) => d && allDisputes.add(d))
        ;(Array.isArray(v.supplement) ? v.supplement : []).forEach((d) => d && allSupplement.add(d))
      } else {
        speeches.push({ label, content: s.reason?.message || '复核失败', ok: false })
      }
    })

    // 2) 情感占比渐进校准：当前值与各验证均值取加权（收敛）
    let criticSentiment = null
    const valid = critics.filter((c) => c.sentiment)
    if (valid.length) {
      const acc = { positive: 0, negative: 0, neutral: 0 }
      for (const c of valid) {
        acc.positive += c.sentiment.positive || 0
        acc.negative += c.sentiment.negative || 0
        acc.neutral += c.sentiment.neutral || 0
      }
      criticSentiment = normalize({
        positive: acc.positive / valid.length,
        negative: acc.negative / valid.length,
        neutral: acc.neutral / valid.length
      })
      // 渐进：新值 = (当前 + 验证均值) / 2
      currentSentiment = normalize({
        positive: (currentSentiment.positive + criticSentiment.positive) / 2,
        negative: (currentSentiment.negative + criticSentiment.negative) / 2,
        neutral: (currentSentiment.neutral + criticSentiment.neutral) / 2
      })
    }

    const agreements = critics.map((c) => c.agreement ?? 100)
    lastAgreement = agreements.length
      ? Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length)
      : 100

    // 3) 主持人归纳并引导下一轮
    let guidance = null
    try {
      guidance = await forumHost({
        keyword,
        round,
        analyze: { ...analyze, sentiment: currentSentiment },
        insight,
        speeches: speeches.filter((s) => s.ok),
        model: host
      })
      lastGuidance = guidance
    } catch (err) {
      throwIfLLMAborted()
      if (err?.name === 'AbortError') throw err
      guidance = {
        summary: `主持人本轮生成失败：${err?.message || '未知错误'}`,
        consensus: [],
        divergences: [],
        questions: [],
        focus: ''
      }
    }

    const roundRecord = {
      round,
      speeches,
      host: guidance,
      agreement: lastAgreement,
      sentiment: currentSentiment
    }
    transcript.push(roundRecord)
    onRound?.(round, { totalRounds, ...roundRecord })
  }

  const gap = sentimentGap(normalize(analyze?.sentiment || {}), currentSentiment)
  const hasDivergence = gap > DIVERGENCE_THRESHOLD || lastAgreement < 70

  const reviewers = [...reviewerLabels].map((label) => ({ label, ok: true }))
  const reviewerNames = reviewers.map((r) => r.label).join('、') || '验证模型'
  const finalGuidance = transcript[transcript.length - 1]?.host || {}

  const trace = hasDivergence
    ? `经 ${totalRounds} 轮论坛协作（主持人引导 ${reviewerNames} 复核），结论与初始存在分歧（情感偏差 ${gap} 个百分点，末轮一致度 ${lastAgreement}%），已多轮渐进校准收敛，结论可溯源。`
    : `经 ${totalRounds} 轮论坛协作（主持人引导 ${reviewerNames} 复核），各方结论趋于一致（末轮一致度 ${lastAgreement}%），多轮交叉验证通过，可信度高。`

  return {
    // 向后兼容旧 debate 字段
    agreement: lastAgreement,
    hasDivergence,
    disputes: [...allDisputes],
    supplement: [...allSupplement],
    reviewers,
    calibratedSentiment: currentSentiment,
    trace,
    // 论坛新增字段
    rounds: transcript,
    consensus: finalGuidance.consensus || [],
    questions: finalGuidance.questions || [],
    focus: finalGuidance.focus || ''
  }
}
