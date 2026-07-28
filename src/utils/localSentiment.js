/**
 * localSentiment.js —— 本地中文情感分析中间件（词典法）
 * ---------------------------------------------------
 * 参考 BettaFish 的「LLM + 本地情感模型」复合分析：不依赖大模型、不消耗 token，
 * 用中文情感词典对文本逐条打分，作为 LLM 情感结果的「校准锚点」。
 *
 * 打分要点：
 *   - 正/负情感词各带强度权重；
 *   - 否定词（不/没/无…）翻转其后情感词极性；
 *   - 程度副词（很/非常/极其…）放大强度；
 *   - 逐条判定 正/负/中性，再汇总为占比分布。
 */

// 正面情感词（词 -> 强度）
const POSITIVE = {
  好: 1, 很好: 2, 优秀: 2, 满意: 2, 喜欢: 2, 支持: 2, 点赞: 2, 赞: 1.5, 棒: 2, 强: 1,
  给力: 2, 靠谱: 1.5, 推荐: 1.5, 惊艳: 2.5, 完美: 2.5, 出色: 2, 认可: 1.5, 肯定: 1.5,
  期待: 1, 希望: 1, 温暖: 1.5, 感动: 2, 值得: 1.5, 划算: 1.5, 实惠: 1.5, 高效: 1.5,
  贴心: 2, 用心: 1.5, 专业: 1.5, 放心: 1.5, 舒服: 1.5, 惊喜: 2, 优质: 2, 顺利: 1.5,
  提升: 1, 进步: 1.5, 改善: 1.5, 突破: 1.5, 领先: 1.5, 成功: 1.5, 幸福: 2, 开心: 2,
  快乐: 2, 赞赏: 2, 好评: 2, 称赞: 2, 厉害: 1.5, 良心: 2, 便捷: 1.5, 感谢: 1.5,
  漂亮: 1.5, 优惠: 1, 稳定: 1, 安心: 1.5, 信任: 1.5, 权威: 1
}

// 负面情感词（词 -> 强度）
const NEGATIVE = {
  差: 1.5, 很差: 2.5, 糟糕: 2.5, 失望: 2, 不满: 2, 讨厌: 2, 反对: 2, 垃圾: 2.5, 坑: 2,
  骗: 2.5, 欺骗: 2.5, 虚假: 2, 造假: 2.5, 抵制: 2, 愤怒: 2.5, 气愤: 2.5, 恶心: 2.5,
  投诉: 2, 维权: 2, 退款: 1.5, 退货: 1.5, 问题: 1, 故障: 1.5, 缺陷: 2, 隐患: 1.5,
  风险: 1, 危机: 2, 崩溃: 2, 卡顿: 1.5, 慢: 1, 贵: 1, 坑人: 2.5, 套路: 2, 敷衍: 2,
  傲慢: 2, 冷漠: 1.5, 敷衍了事: 2, 无语: 1.5, 离谱: 2, 荒唐: 2, 恶劣: 2.5, 差劲: 2.5,
  黑心: 2.5, 无良: 2.5, 违规: 2, 违法: 2.5, 曝光: 1.5, 丑闻: 2.5, 翻车: 2, 塌房: 2,
  质疑: 1.5, 争议: 1.5, 批评: 1.5, 谴责: 2.5, 担忧: 1.5, 焦虑: 1.5, 痛心: 2, 后悔: 2,
  劝退: 2, 避雷: 2, 崩: 1.5, 烂: 2, 恶评: 2, 差评: 2, 欺诈: 2.5, 霸王: 1.5, 泄露: 2,
  停摆: 2, 瘫痪: 2, 亏损: 1.5, 下跌: 1, 暴跌: 2, 举报: 1.5, 处罚: 1.5, 道歉: 1
}

// 否定词（翻转其后情感词极性）
const NEGATIONS = ['不', '没', '没有', '无', '非', '未', '别', '莫', '毫无', '并非', '绝不', '从不']

// 程度副词（放大强度）
const DEGREES = {
  极其: 2, 极为: 2, 极度: 2, 非常: 1.8, 超级: 1.8, 特别: 1.6, 十分: 1.6, 相当: 1.5,
  格外: 1.5, 尤其: 1.5, 太: 1.6, 超: 1.6, 很: 1.4, 挺: 1.2, 比较: 0.8, 有点: 0.7,
  稍微: 0.6, 略: 0.6, 最: 1.8, 完全: 1.6, 更: 1.3, 真的: 1.3, 真是: 1.3
}

// 中性判定阈值：|score| 小于该值视为中性
const NEUTRAL_THRESHOLD = 1

/** 在词典中，从 pos 位置向前回看窗口内是否有否定/程度词，返回极性系数与强度倍率 */
function lookBack(text, pos, win = 3) {
  let negate = 1
  let degree = 1
  const start = Math.max(0, pos - win)
  const seg = text.slice(start, pos)
  for (const n of NEGATIONS) {
    if (seg.includes(n)) {
      negate = -1
      break
    }
  }
  for (const [d, mul] of Object.entries(DEGREES)) {
    if (seg.includes(d)) {
      degree = mul
      break
    }
  }
  return { negate, degree }
}

/** 扫描一段文本，累加正/负得分 */
function scoreText(text = '') {
  const t = String(text)
  let score = 0
  let hits = 0

  const scan = (dict, sign) => {
    for (const [word, weight] of Object.entries(dict)) {
      let idx = t.indexOf(word)
      while (idx !== -1) {
        const { negate, degree } = lookBack(t, idx)
        score += sign * weight * degree * negate
        hits++
        idx = t.indexOf(word, idx + word.length)
      }
    }
  }

  scan(POSITIVE, 1)
  scan(NEGATIVE, -1)
  return { score, hits }
}

/**
 * 对文本列表做本地情感分析，返回情感占比分布与统计信息。
 * @param {string[]} texts 清洗后的文本列表
 * @returns {{ sentiment:{positive:number, negative:number, neutral:number}, analyzed:number, coverage:number }}
 *   - sentiment: 三分类占比（合计 100）；
 *   - analyzed:  参与统计的文本条数；
 *   - coverage:  命中情感词的文本占比（0-100，反映词典覆盖度/可信度）。
 */
export function analyzeLocalSentiment(texts = []) {
  const list = Array.isArray(texts) ? texts.filter((t) => t && String(t).trim()) : []
  if (list.length === 0) {
    return { sentiment: { positive: 0, negative: 0, neutral: 100 }, analyzed: 0, coverage: 0 }
  }

  let pos = 0
  let neg = 0
  let neu = 0
  let hitDocs = 0

  for (const text of list) {
    const { score, hits } = scoreText(text)
    if (hits > 0) hitDocs++
    if (score > NEUTRAL_THRESHOLD) pos++
    else if (score < -NEUTRAL_THRESHOLD) neg++
    else neu++
  }

  const total = list.length
  const raw = {
    positive: Math.round((pos / total) * 100),
    negative: Math.round((neg / total) * 100),
    neutral: Math.round((neu / total) * 100)
  }
  // 归一化，修正四舍五入偏差
  const sum = raw.positive + raw.negative + raw.neutral
  if (sum !== 100) raw.neutral += 100 - sum

  return {
    sentiment: raw,
    analyzed: total,
    coverage: Math.round((hitDocs / total) * 100)
  }
}

/**
 * 将 LLM 情感占比与本地情感占比按权重融合（校准）。
 * 覆盖度低时自动降低本地权重（避免词典未命中时误导）。
 * @param {{positive:number,negative:number,neutral:number}} llm  LLM 情感占比
 * @param {{sentiment:Object, coverage:number}} local 本地情感结果
 * @param {number} weight 本地基础权重（0-1）
 * @returns {{positive:number,negative:number,neutral:number}}
 */
export function fuseSentiment(llm = {}, local, weight = 0.3) {
  if (!local || !local.sentiment) return normalize(llm)
  // 覆盖度越低，本地实际权重越小（coverage 100% 时取满权重）
  const w = Math.max(0, Math.min(1, weight)) * (Math.max(0, Math.min(100, local.coverage)) / 100)
  const ls = local.sentiment
  const fused = {
    positive: (llm.positive || 0) * (1 - w) + (ls.positive || 0) * w,
    negative: (llm.negative || 0) * (1 - w) + (ls.negative || 0) * w,
    neutral: (llm.neutral || 0) * (1 - w) + (ls.neutral || 0) * w
  }
  return normalize(fused)
}

function normalize(s = {}) {
  const p = Math.round(s.positive || 0)
  const n = Math.round(s.negative || 0)
  let u = Math.round(s.neutral || 0)
  const sum = p + n + u
  if (sum !== 100 && sum > 0) u += 100 - sum
  return { positive: p, negative: n, neutral: u }
}
