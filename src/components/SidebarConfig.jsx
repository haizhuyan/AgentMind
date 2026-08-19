import { REPORT_TEMPLATES } from '../report/templates.js'

/**
 * SidebarConfig —— 左侧边栏配置区
 * ---------------------------------------------------
 * 承载「参与协作的模型」选择器与「报告模板」选择器，
 * 从 InputPanel 拆出，配合左中右三栏布局固定展示在左侧。
 */
export default function SidebarConfig({
  loading,
  models = [],
  selectedIds = [],
  onToggleModel,
  primaryId,
  onSetPrimary,
  templateId,
  onSelectTemplate
}) {
  return (
    <div className="sidebar-config">
      {models.length > 0 && (
        <div className="model-selector">
          <span className="model-selector-label">参与协作的模型</span>
          <div className="model-chips">
            {models.map((m) => {
              const active = selectedIds.includes(m.id)
              const isPrimary = m.id === primaryId
              return (
                <div key={m.id} className="model-chip-wrap">
                  <button
                    type="button"
                    className={`model-chip ${active ? 'active' : ''} ${isPrimary ? 'primary' : ''}`}
                    onClick={() => onToggleModel?.(m.id)}
                    disabled={loading}
                    title={m.model}
                  >
                    <span className="model-chip-check">{active ? '✓' : ''}</span>
                    {m.label}
                    {isPrimary && <span className="model-chip-tag">主</span>}
                  </button>
                  {active && !isPrimary && (
                    <button
                      type="button"
                      className="model-set-primary"
                      onClick={() => onSetPrimary?.(m.id)}
                      disabled={loading}
                      title="设为主模型（负责清洗・洞察・报告・主持）"
                    >
                      设为主
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {selectedIds.length > 1 && (
            <p className="model-selector-hint">
              分析阶段 {selectedIds.length} 个模型并行集成，验证阶段跨模型交叉复核；
              <b>主模型</b>负责清洗・洞察・报告（默认列表首位，可点「设为主」切换）。
            </p>
          )}
        </div>
      )}

      {onSelectTemplate && (
        <div className="template-selector">
          <span className="model-selector-label">报告模板</span>
          <div className="template-chips">
            {REPORT_TEMPLATES.map((t) => {
              const active = t.id === templateId
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`template-chip ${active ? 'active' : ''}`}
                  onClick={() => onSelectTemplate(t.id)}
                  disabled={loading}
                  title={t.desc}
                  style={active ? { borderColor: t.accent, color: t.accent } : undefined}
                >
                  {active && <span className="template-chip-check">✓</span>}
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
