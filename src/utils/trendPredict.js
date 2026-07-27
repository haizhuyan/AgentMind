/**
 * trendPredict.js —— 舆情趋势推演与风险预判工具
 * ---------------------------------------------------
 * 基于分析 Agent 与洞察 Agent 的结果，进行本地化的
 * 趋势推演与风险等级评估，输出结构化 JSON，
 * 支撑「AI 舆情顾问」能力。（纯前端计算，无需 LLM）
 */

/**
 * 根据情感占比与风险数量评估风险等级
 * @param {Object} sentiment { positive, negative, neutral }
 * @param {number} riskCount 洞察 Agent 识别的风险点数量
 * @returns {{ level: string, score: number, color: string }}
 */
function evaluateRisk(sentiment = {}, riskCount = 0) {
  const negative = sentiment.negative || 0
  // 风险分 = 负面情感权重 * 0.7 + 风险点数量权重 * 0.3
  const score = Math.min(
    100,
    Math.round(negative * 0.7 + Math.min(riskCount, 6) * 5)
  )

  let level = '低'
  let color = '#22c55e'
  if (score >= 60) {
    level = '高'
    color = '#ef4444'
  } else if (score >= 35) {
    level = '中'
    color = '#f59e0b'
  }
  return { level, score, color }
}

/**
 * 生成趋势推演结论
 * @param {Object} params
 * @param {Object} params.analyze  分析 Agent 结果
 * @param {Object} params.insight  洞察 Agent 结果
 * @returns {{ direction:string, riskLevel:Object, prediction:string, watchPoints:string[] }}
 */
export function trendPredict({ analyze, insight }) {
  const sentiment = analyze?.sentiment || {}
  const riskCount = insight?.risks?.length || 0
  const riskLevel = evaluateRisk(sentiment, riskCount)

  const positive = sentiment.positive || 0
  const negative = sentiment.negative || 0

  // 情感走向判断
  let direction = '平稳'
  if (negative - positive >= 20) direction = '恶化'
  else if (positive - negative >= 20) direction = '向好'

  const predictionMap = {
    恶化: '负面情绪占据主导，若不及时干预，未来短期内舆情有进一步发酵、扩散的风险。',
    向好: '正面口碑占据主导，舆情整体健康，可借势强化品牌正向传播。',
    平稳: '正负情绪相对均衡，舆情处于观望期，需持续监测关键风险点变化。'
  }

  return {
    direction,
    riskLevel,
    prediction: predictionMap[direction],
    watchPoints: (insight?.risks || []).slice(0, 3)
  }
}
