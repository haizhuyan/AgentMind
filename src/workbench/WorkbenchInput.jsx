import { useState, useEffect, useRef } from 'react'
import { parseNaturalLanguage } from '../utils/nlpParser.js'
import { REPORT_TEMPLATES } from '../report/templates.js'

/**
 * WorkbenchInput —— 底部输入区
 * - 首次 / 无报告：关键词检索（短词或一句话需求 → 启动流水线）
 * - 报告完成后：自然语言追问（就本报告继续讨论，不新开会话）
 * - 文本文件：附件按钮上传 .txt/.md 等，而非展开粘贴框
 */
export default function WorkbenchInput({
  loading,
  chatLoading,
  hasReport,
  onAnalyze,
  onChat,
  onStop,
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
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const busy = loading || chatLoading

  useEffect(() => {
    if (seedKeyword && seedKeyword.value === '') {
      setValue('')
      setFileName('')
      setError('')
      return
    }
    if (seedKeyword?.value) {
      setValue(seedKeyword.value)
      setFileName('')
      setError('')
    }
  }, [seedKeyword])

  function autoResize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function submitAnalyze() {
    const raw = value.trim()
    if (!raw) {
      setError('请输入关键词或一句话需求')
      return
    }

    // 首次会话：短词=关键词检索；稍长/含维度词=自然语言解析后仍走同一流水线
    if (raw.includes('\n')) {
      setError('多行文本请使用右侧「上传文本文件」')
      return
    }

    const parsed = parseNaturalLanguage(raw)
    const kw = (parsed.keyword || raw).trim()
    if (!kw) {
      setError('未能识别分析对象，请换一种表述')
      return
    }
    if (kw.length > 20) {
      setError('关键词过长，请浓缩为 1-20 字，或改用上传文本文件')
      return
    }
    onAnalyze({ keyword: kw, dimensions: parsed.dimensions, rawInput: raw })
    setValue('')
    setFileName('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function submitChat() {
    const msg = value.trim()
    if (!msg) {
      setError('请输入想继续讨论的问题')
      return
    }
    onChat?.({ message: msg })
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function submit() {
    if (busy) return
    if (hasReport) submitChat()
    else submitAnalyze()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function openFilePicker() {
    if (busy || hasReport) return
    fileRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const name = file.name || '文本文件'
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '').trim()
      if (text.length < 10) {
        setError('文件内容过短，请上传至少 10 个字的舆情文本')
        return
      }
      const topic =
        name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '').slice(0, 12) || text.slice(0, 12)
      setFileName(name)
      setError('')
      onAnalyze({ keyword: topic, rawText: text })
      setValue('')
    }
    reader.onerror = () => setError('读取文件失败，请重试')
    reader.readAsText(file, 'UTF-8')
  }

  const modeLabel = hasReport ? '追问' : '关键词'
  const placeholder = hasReport
    ? '就本报告继续提问，例如：负面主要来自哪些渠道？有哪些应对建议？'
    : '输入 1–20 字关键词，或一句话需求；也可点右侧上传文本文件…'

  return (
    <div className="input-area">
      <div className="input-inner">
        {/* 配置行：仅新分析时强调；追问时仍可改主模型用于对话 */}
        <div className={`config-row ${hasReport ? 'config-row-muted' : ''}`}>
          {models.length > 0 && (
            <div className="config-group">
              <span className="config-label">主模型</span>
              <div className="config-select">
                <select
                  value={primaryId || models[0]?.id || ''}
                  onChange={(e) => onSetPrimary?.(e.target.value)}
                  disabled={busy}
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
                    disabled={busy || hasReport}
                    title={hasReport ? '追问阶段沿用当前报告；新建分析可改模板' : t.desc}
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
                  disabled={busy || hasReport}
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
                  disabled={busy || hasReport}
                  title="MindSpider 真实爬虫（需后端环境与平台登录）"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  爬虫
                </button>
              </div>
              {collectSource === 'mindspider' && !hasReport && (
                <div className="config-select">
                  <select
                    value={collectPlatform || 'weibo'}
                    onChange={(e) => onPlatformChange?.(e.target.value)}
                    disabled={busy}
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

        {hasReport && (
          <div className="input-mode-hint">
            报告已生成 · 下方输入将就本报告继续讨论（新建分析请点左侧「新建分析」）
          </div>
        )}

        <div className="input-box">
          <div className="input-prompt-icon">
            <span className="dot"></span>
            <span>{modeLabel}</span>
          </div>
          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder={placeholder}
            rows="1"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
              autoResize(e.target)
            }}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />
          <div className="input-actions">
            {!hasReport && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.csv,.text,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="input-attach-btn"
                  title="上传文本文件（.txt / .md / .csv）作为舆情样本"
                  onClick={openFilePicker}
                  disabled={busy}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
            <button
              type="button"
              className={`send-btn ${loading ? 'stop' : ''}`}
              title={loading ? '停止分析' : hasReport ? '发送追问' : '开始分析'}
              onClick={loading ? onStop : submit}
              disabled={chatLoading}
            >
              {loading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              ) : chatLoading ? (
                <span className="send-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {fileName && !hasReport && (
          <div className="input-file-chip">已选文件：{fileName}</div>
        )}
        {error && <div className="input-error">⚠ {error}</div>}
        <div className="input-hint">
          {hasReport
            ? '追问基于当前报告内容，不会重新爬取；换题请使用「新建分析」'
            : '关键词检索启动流水线 · 一句话需求会自动抽取对象 · 长文本请上传文件'}
        </div>
      </div>
    </div>
  )
}
