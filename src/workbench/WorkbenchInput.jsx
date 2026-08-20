import { useState, useEffect, useRef } from 'react'
import { parseNaturalLanguage } from '../utils/nlpParser.js'
import { REPORT_TEMPLATES } from '../report/templates.js'

/**
 * WorkbenchInput —— 底部输入区（从 homedemo workbench.html 1:1 还原）
 * 配置行：模型（主模型下拉）/ 模板 chips / 数据源分段开关
 * 输入框：PROMPT 标记 + 自适应 textarea + 附件（粘贴模式）+ 发送
 */
export default function WorkbenchInput({
  loading,
  onAnalyze,
  models = [],
  primaryId,
  onSetPrimary,
  templateId,
  onSelectTemplate,
  collectSource,
  collectPlatform,
  onSourceChange,
  onPlatformChange,
  seedKeyword
}) {
  const [value, setValue] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteTopic, setPasteTopic] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  // 外部回填：热搜/历史点击填入关键词；空字符串（分析完成清空）→ 清空输入框
  useEffect(() => {
    if (seedKeyword && seedKeyword.value === '') {
      setValue('')
      setPasteTopic('')
      setPasteMode(false)
      setError('')
      return
    }
    if (seedKeyword?.value) {
      setValue(seedKeyword.value)
      setPasteMode(false)
      setError('')
    }
  }, [seedKeyword])

  // textarea 自适应高度（与设计稿脚本行为一致）
  function autoResize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function submit() {
    if (loading) return

    if (pasteMode) {
      const text = value.trim()
      if (text.length < 10) {
        setError('请粘贴至少 10 个字的舆情文本')
        return
      }
      const topic = pasteTopic.trim() || text.slice(0, 12)
      onAnalyze({ keyword: topic, rawText: text })
      return
    }

    const raw = value.trim()
    if (!raw) {
      setError('请输入关键词或一句话需求')
      return
    }

    // 多行或长文本 → 按粘贴文本处理
    if (raw.includes('\n') || raw.length >= 50) {
      onAnalyze({ keyword: raw.slice(0, 20), rawText: raw })
      return
    }

    // 短文本 → 自然语言解析（纯关键词也走此路径，解析器返回自身作为关键词）
    const parsed = parseNaturalLanguage(raw)
    const kw = (parsed.keyword || '').trim()
    if (!kw) {
      setError('未能识别分析对象，请换一种表述')
      return
    }
    if (kw.length > 20) {
      setError('关键词长度需在 1-20 字之间')
      return
    }
    onAnalyze({ keyword: kw, dimensions: parsed.dimensions, rawInput: raw })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="input-area">
      <div className="input-inner">
        {/* 配置行：模型 / 模板 / 数据源 */}
        <div className="config-row">
          {models.length > 0 && (
            <div className="config-group">
              <span className="config-label">主模型</span>
              <div className="config-select">
                <select
                  value={primaryId || models[0]?.id || ''}
                  onChange={(e) => onSetPrimary?.(e.target.value)}
                  disabled={loading}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {onSelectTemplate && (
            <div className="config-group">
              <span className="config-label">模板</span>
              <div className="template-chips">
                {REPORT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`template-chip ${t.id === templateId ? 'active' : ''}`}
                    onClick={() => onSelectTemplate(t.id)}
                    disabled={loading}
                    title={t.desc}
                  >
                    <span className="chip-dot"></span>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onSourceChange && (
            <div className="config-group">
              <span className="config-label">数据源</span>
              <div className="datasource-toggle">
                <button
                  type="button"
                  className={`datasource-option ${collectSource !== 'mindspider' ? 'active' : ''}`}
                  onClick={() => onSourceChange('search')}
                  disabled={loading}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  API聚合
                </button>
                <button
                  type="button"
                  className={`datasource-option ${collectSource === 'mindspider' ? 'active' : ''}`}
                  onClick={() => onSourceChange('mindspider')}
                  disabled={loading}
                  title="MindSpider 真实爬虫（需后端环境与平台登录）"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  爬虫
                </button>
              </div>
              {collectSource === 'mindspider' && (
                <div className="config-select">
                  <select
                    value={collectPlatform || 'weibo'}
                    onChange={(e) => onPlatformChange?.(e.target.value)}
                    disabled={loading}
                  >
                    <option value="weibo">微博</option>
                    <option value="xhs">小红书</option>
                    <option value="dy">抖音</option>
                    <option value="ks">快手</option>
                    <option value="bili">B站</option>
                    <option value="tieba">贴吧</option>
                    <option value="zhihu">知乎</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 输入框 */}
        {pasteMode && (
          <input
            className="paste-topic"
            type="text"
            value={pasteTopic}
            placeholder="主题（可选，如：某品牌客服争议）"
            onChange={(e) => setPasteTopic(e.target.value)}
            disabled={loading}
          />
        )}
        <div className="input-box">
          <div className="input-prompt-icon">
            <span className="dot"></span>
            <span>{pasteMode ? 'PASTE' : 'PROMPT'}</span>
          </div>
          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder={
              pasteMode
                ? '粘贴要分析的舆情文本、用户评论、社媒讨论（每行一条更佳）…'
                : '输入关键词、一句话需求或粘贴舆情文本，AgentMind 将自动启动六智能体流水线...'
            }
            rows="1"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
              autoResize(e.target)
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="input-actions">
            <button
              type="button"
              className={`input-attach-btn ${pasteMode ? 'active' : ''}`}
              title={pasteMode ? '返回输入模式' : '粘贴文本模式'}
              onClick={() => {
                setPasteMode(!pasteMode)
                setError('')
              }}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="send-btn" title="发送" onClick={submit} disabled={loading}>
              {loading ? (
                <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {error && <div className="input-error">⚠ {error}</div>}
        <div className="input-hint">
          AgentMind 可能产生不准确的信息 · 重要结论请核实来源 · 离线演示模式使用本地缓存数据
        </div>
      </div>
    </div>
  )
}
