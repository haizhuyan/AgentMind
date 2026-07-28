/**
 * report/templates.js —— 报告模板库
 * ---------------------------------------------------
 * 参考 BettaFish 的 ReportEngine/report_template：按报告类型预设章节大纲，
 * 在生成阶段将大纲注入报告 Agent 的提示词，引导模型产出结构化、可 IR 化的报告。
 *
 * 每个模板：
 *   - id / name / desc：标识与展示；
 *   - sections：章节大纲（title + guide 引导说明），报告按此结构分节撰写；
 *   - accent：报告主题色（用于打印/导出视图）。
 */

export const REPORT_TEMPLATES = [
  {
    id: 'general',
    name: '通用舆情分析报告',
    desc: '适用于大多数关键词舆情的标准分析结构',
    accent: '#2563eb',
    sections: [
      { title: '舆情概况', guide: '概述事件背景、传播范围与总体态势' },
      { title: '情感分析', guide: '解读正/负/中性占比及其含义，指出情绪主导面' },
      { title: '深度洞察', guide: '结合关键词与观点，剖析深层原因与核心诉求' },
      { title: '趋势与风险', guide: '研判走向，列出主要风险点与风险等级' },
      { title: '应对建议', guide: '给出可操作的处置与传播建议' }
    ]
  },
  {
    id: 'brand',
    name: '企业品牌声誉分析报告',
    desc: '面向企业/品牌的声誉健康度评估',
    accent: '#7c3aed',
    sections: [
      { title: '品牌声誉概况', guide: '总体声誉态势与舆论关注焦点' },
      { title: '口碑情感画像', guide: '正负口碑结构、典型正面/负面声音' },
      { title: '核心议题剖析', guide: '围绕品牌的关键议题、争议点与用户诉求' },
      { title: '声誉风险预警', guide: '潜在声誉风险、风险等级与可能的次生舆情' },
      { title: '品牌管理建议', guide: '声誉修复、正向传播与长期口碑建设建议' }
    ]
  },
  {
    id: 'crisis',
    name: '危机公关应对报告',
    desc: '突发负面/危机事件的快速研判与处置',
    accent: '#dc2626',
    sections: [
      { title: '事件概述', guide: '危机事件的起因、经过与当前状态' },
      { title: '舆论态势研判', guide: '情绪烈度、扩散速度与关键传播节点' },
      { title: '风险与影响评估', guide: '对主体的影响面、风险等级与升级可能' },
      { title: '关键诉求梳理', guide: '公众核心诉求与情绪触发点' },
      { title: '处置与回应策略', guide: '分阶段的应对动作、回应口径与传播策略' }
    ]
  },
  {
    id: 'review',
    name: '事件舆情复盘报告',
    desc: '事件平息后的完整回顾与经验沉淀',
    accent: '#0891b2',
    sections: [
      { title: '事件回顾', guide: '按时间线还原事件全貌与关键转折' },
      { title: '传播路径分析', guide: '舆情发酵、发展、平息的传播脉络' },
      { title: '情感演变', guide: '各阶段情绪变化与主导情感迁移' },
      { title: '得失分析', guide: '应对过程中的成效与不足' },
      { title: '经验与启示', guide: '可沉淀的经验教训与后续改进建议' }
    ]
  }
]

export const DEFAULT_TEMPLATE_ID = 'general'

/** 按 id 获取模板，找不到时回退默认模板。 */
export function getTemplate(id) {
  return (
    REPORT_TEMPLATES.find((t) => t.id === id) ||
    REPORT_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ||
    REPORT_TEMPLATES[0]
  )
}
