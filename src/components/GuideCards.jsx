import { AGENT_STEPS } from '../services/agentOrchestrator.js'

/**
 * GuideCards —— 使用引导卡片（中间区域空状态）
 * ---------------------------------------------------
 * 首次进入、尚未开始分析时，在搜索框下方展示「多智能体协作流程」
 * 六步导览，让用户直观了解系统能力；分析开始后自动隐藏。
 * 步骤数据直接复用 agentOrchestrator 的 AGENT_STEPS，与真实流程保持一致。
 */

// 每步对应的展示图标（emoji）
const STEP_ICONS = {
  collect: '🔍',
  clean: '🧹',
  analyze: '📊',
  insight: '💡',
  debate: '🎙️',
  report: '📄'
}

export default function GuideCards() {
  return (
    <section className="card guide-cards">
      <h2 className="card-title">
        <span className="title-bar" />
        多智能体协作流程
        <span className="guide-badge">点击热搜或输入关键词即可开始</span>
      </h2>

      <div className="guide-grid">
        {AGENT_STEPS.map((step, i) => (
          <div key={step.id} className="guide-card">
            <div className="guide-icon">{STEP_ICONS[step.id] || '🤖'}</div>
            <div className="guide-body">
              <div className="guide-name">
                <span className="guide-index">{String(i + 1).padStart(2, '0')}</span>
                {step.name}
              </div>
              <div className="guide-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="guide-footer">
        全自动闭环：一句话需求 → 采集 · 清洗 · 分析 · 洞察 · 论坛协作 · 报告，每步中间产物可展开查看。
      </p>
    </section>
  )
}
