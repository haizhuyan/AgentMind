/**
 * nlpParser.js —— 自然语言需求解析工具
 * ---------------------------------------------------
 * 将用户的「一句话需求」解析为结构化的 { keyword, dimensions }。
 * 例：「分析新能源汽车近期舆情风险和趋势」
 *   → { keyword: "新能源汽车", dimensions: ["风险预判", "趋势预测"] }
 *
 * 采用纯前端规则解析，零依赖、零延迟，保证演示稳定。
 */

// 分析维度关键词映射
const DIMENSION_RULES = [
  { key: '风险预判', patterns: ['风险', '危机', '预警', '负面', '舆情苗头'] },
  { key: '趋势预测', patterns: ['趋势', '走向', '预测', '推演', '未来'] },
  { key: '情感分析', patterns: ['情感', '口碑', '评价', '好评', '差评', '态度'] },
  { key: '诉求挖掘', patterns: ['诉求', '需求', '意见', '建议', '反馈', '痛点'] },
  { key: '竞品分析', patterns: ['竞品', '对比', '竞争', '对手'] }
]

// 需要从句子中剥离的动词/修饰词，便于提取核心关键词
const STOP_WORDS = [
  '分析', '帮我', '请', '一下', '近期', '最近', '目前', '当前', '的',
  '舆情', '风险', '趋势', '预测', '推演', '情感', '口碑', '评价',
  '和', '与', '及', '以及', '潜在', '深层', '相关', '关于', '看看',
  '预判', '走向', '诉求', '需求', '监测', '监控', '情况', '如何', '怎么样'
]

/**
 * 解析自然语言需求
 * @param {string} input 用户输入（关键词或一句话需求）
 * @returns {{ keyword: string, dimensions: string[], isNatural: boolean }}
 */
export function parseNaturalLanguage(input) {
  const text = (input || '').trim()

  // 命中的分析维度
  const dimensions = DIMENSION_RULES.filter((rule) =>
    rule.patterns.some((p) => text.includes(p))
  ).map((r) => r.key)

  // 判定是否为「一句话需求」：含维度词或长度较长
  const isNatural = dimensions.length > 0 || text.length > 12

  // 提取核心关键词：去除停用词与标点
  let keyword = text
  STOP_WORDS.forEach((w) => {
    keyword = keyword.split(w).join('')
  })
  keyword = keyword.replace(/[，。、！？,.!?\s]/g, '').trim()

  // 兜底：解析后为空则取原始输入前 20 字
  if (!keyword) {
    keyword = text.slice(0, 20)
  }
  // 长度限制 1-20 字（PRD 要求）
  keyword = keyword.slice(0, 20)

  return {
    keyword,
    dimensions: dimensions.length ? dimensions : ['情感分析', '风险预判', '趋势预测'],
    isNatural
  }
}
