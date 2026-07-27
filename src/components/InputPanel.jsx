import { useState } from 'react'
import { parseNaturalLanguage } from '../utils/nlpParser.js'

/**
 * InputPanel —— 输入区
 * 三种模式：
 *   keyword —— 关键词输入（联网搜索采集）
 *   natural —— 一句话自然语言需求（自动解析）
 *   paste   —— 直接粘贴舆情文本（不依赖任何搜索 API）
 */
export default function InputPanel({ loading, onAnalyze, onReset, hasResult }) {
  const [mode, setMode] = useState('keyword')
  const [value, setValue] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteTopic, setPasteTopic] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState(null)

  const naturalMode = mode === 'natural'
  const pasteMode = mode === 'paste'

  const placeholder = naturalMode
    ? '用一句话描述需求，如：分析新能源汽车近期舆情风险和趋势'
    : '请输入舆情关键词，如：新能源汽车'

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    setError('')
    if (naturalMode && v.trim()) {
      setParsed(parseNaturalLanguage(v))
    } else {
      setParsed(null)
    }
  }

  function validate(keyword) {
    if (!keyword || !keyword.trim()) return '关键词不能为空'
    if (keyword.trim().length > 20) return '关键词长度需在 1-20 字之间'
    return ''
  }

  function switchMode(next) {
    setMode(next)
    setParsed(null)
    setError('')
  }

  function submit() {
    if (loading) return

    // 粘贴文本模式：直接把文本交给流水线，不走联网采集
    if (pasteMode) {
      const text = pasteText.trim()
      if (text.length < 10) {
        setError('请粘贴至少 10 个字的舆情文本')
        return
      }
      const topic = pasteTopic.trim() || text.slice(0, 12)
      onAnalyze({ keyword: topic, rawText: text })
      return
    }

    let keyword = value.trim()
    let dimensions = null

    if (naturalMode) {
      const res = parseNaturalLanguage(value)
      keyword = res.keyword
      dimensions = res.dimensions
    }

    const err = validate(keyword)
    if (err) {
      setError(err)
      return
    }
    onAnalyze({ keyword, dimensions, rawInput: value.trim() })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !pasteMode) submit()
  }

  return (
    <section className="card input-panel">
      <div className="input-mode-switch">
        <button
          className={mode === 'keyword' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => switchMode('keyword')}
          disabled={loading}
        >
          关键词输入
        </button>
        <button
          className={mode === 'natural' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => switchMode('natural')}
          disabled={loading}
        >
          自然语言对话
        </button>
        <button
          className={mode === 'paste' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => switchMode('paste')}
          disabled={loading}
        >
          粘贴文本分析
        </button>
      </div>

      {pasteMode ? (
        <div className="paste-area">
          <input
            className="keyword-input"
            type="text"
            value={pasteTopic}
            placeholder="主题（可选，如：某品牌客服争议）"
            onChange={(e) => setPasteTopic(e.target.value)}
            disabled={loading}
          />
          <textarea
            className="paste-textarea"
            value={pasteText}
            placeholder="粘贴要分析的舆情文本、用户评论、社媒讨论等（每行一条更佳）。此模式不依赖任何搜索 API。"
            onChange={(e) => {
              setPasteText(e.target.value)
              setError('')
            }}
            rows={6}
            disabled={loading}
          />
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? '分析中…' : '开始分析'}
          </button>
        </div>
      ) : (
        <div className="input-row">
          <input
            className="keyword-input"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? '分析中…' : '开始分析'}
          </button>
        </div>
      )}

      {error && <p className="input-error">{error}</p>}

      {naturalMode && parsed && (
        <div className="parsed-hint">
          已解析 → 核心对象：<b>{parsed.keyword}</b>　分析维度：
          {parsed.dimensions.map((d) => (
            <span key={d} className="dim-tag">
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="input-actions">
        {hasResult && (
          <button className="btn-ghost" onClick={onReset} disabled={loading}>
            重新分析
          </button>
        )}
      </div>
    </section>
  )
}
