import { useState, useRef, useEffect } from 'react'
import InputPanel from './components/InputPanel.jsx'
import AgentFlow from './components/AgentFlow.jsx'
import ChartPanel from './components/ChartPanel.jsx'
import ReportPanel from './components/ReportPanel.jsx'
import HotList from './components/HotList.jsx'
import { runAgentFlow } from './services/agentOrchestrator.js'
import { fetchModels } from './services/llmService.js'
import { useDemoMode } from './services/demoMode.js'
import { DEFAULT_TEMPLATE_ID } from './report/templates.js'
import './App.css'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [statuses, setStatuses] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [streamReport, setStreamReport] = useState('')
  const [thinking, setThinking] = useState('')

  // 多模型协作：可用模型列表 + 用户选中参与协作的模型 id
  const [models, setModels] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  // 主模型 id：默认取列表首位（后端 LLM_PRIMARY 指定，如 Kimi），用户可手动切换
  const [primaryId, setPrimaryId] = useState('')
  // 热搜等外部回填的关键词（同步到输入框）
  const [seedKeyword, setSeedKeyword] = useState(null)
  // 报告模板 id（决定章节大纲与导出风格）
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID)
  // 离线演示模式：无网络/未配置密钥时以本地预置数据完整展示流程
  const [demoMode, setDemoMode] = useDemoMode()
  // 本次分析对象关键词（用于协作流程产物导出，失败/中断时仍可用）
  const [activeKeyword, setActiveKeyword] = useState('')

  const chartRef = useRef(null)

  // 启动时 & 切换离线演示模式时：拉取对应的模型列表，默认全选（全部参与协作）
  useEffect(() => {
    fetchModels().then((list) => {
      setModels(list)
      setSelectedIds(list.map((m) => m.id))
      // 默认主模型 = 列表首位（后端已把 LLM_PRIMARY 排到最前）
      if (list.length) setPrimaryId(list[0].id)
    })
  }, [demoMode])

  function toggleModel(id) {
    setSelectedIds((prev) => {
      // 至少保留一个模型
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev
        const next = prev.filter((x) => x !== id)
        // 若取消勾选的是主模型，自动把剩余选中的第一个设为主模型
        if (id === primaryId) {
          const fallback = models.map((m) => m.id).find((x) => next.includes(x))
          if (fallback) setPrimaryId(fallback)
        }
        return next
      }
      // 保持与 models 同顺序（用于稳定的展示与验证顺序）
      return models.map((m) => m.id).filter((x) => prev.includes(x) || x === id)
    })
  }

  // 手动指定主模型：确保其处于选中状态
  function setPrimary(id) {
    setPrimaryId(id)
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev
        : models.map((m) => m.id).filter((x) => prev.includes(x) || x === id)
    )
  }

  // 分析完成后自动滚动到图表区
  useEffect(() => {
    if (result && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  function reset() {
    setResult(null)
    setStatuses({})
    setError('')
    setStreamReport('')
    setThinking('')
  }

  async function handleAnalyze({ keyword, rawText }) {
    reset()
    setLoading(true)
    setError('')
    setActiveKeyword(keyword || '')
    try {
      const chosen = models.filter((m) => selectedIds.includes(m.id))
      // 将主模型排到首位（流水线以 selected[0] 为主模型）
      const ordered = [
        ...chosen.filter((m) => m.id === primaryId),
        ...chosen.filter((m) => m.id !== primaryId)
      ]
      const data = await runAgentFlow({
        keyword,
        rawText,
        models: ordered,
        templateId,
        onStep: (stepId, status, detail) => {
          setStatuses((prev) => ({
            ...prev,
            [stepId]: { status, detail: detail ?? prev[stepId]?.detail }
          }))
        },
        onReport: (evt, text) => {
          if (evt === 'token') setStreamReport((prev) => prev + text)
          else if (evt === 'reasoning') setThinking((prev) => prev + text)
        }
      })
      setResult(data)
    } catch (err) {
      // 标记当前运行中的步骤为失败
      setStatuses((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          if (next[k]?.status === 'running') {
            next[k] = { ...next[k], status: 'failed' }
          }
        })
        return next
      })
      setError(err.message || '分析过程发生异常')
    } finally {
      setLoading(false)
    }
  }

  // 热搜点击：先把关键词回填到输入框（切到关键词模式），再发起分析
  function handlePickHot(keyword) {
    const kw = String(keyword || '').trim()
    if (!kw || loading) return
    // seedKeyword 使用包装对象，确保点击同一热点时引用变化可触发 InputPanel 同步
    setSeedKeyword({ value: kw })
    handleAnalyze({ keyword: kw })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon" />
          AgentMind
        </div>
        <h1 className="app-title">AI 多智能体舆情分析系统</h1>
        <p className="app-subtitle">
          一句话需求 → 采集 · 清洗 · 分析 · 洞察 · 辩论 · 报告 全自动闭环
        </p>
      </header>

      <main className="app-main">
        <InputPanel
          loading={loading}
          onAnalyze={handleAnalyze}
          onReset={reset}
          hasResult={!!result}
          models={models}
          selectedIds={selectedIds}
          onToggleModel={toggleModel}
          primaryId={primaryId}
          onSetPrimary={setPrimary}
          seedKeyword={seedKeyword}
          templateId={templateId}
          onSelectTemplate={setTemplateId}
        />

        <HotList
          key={demoMode ? 'demo' : 'live'}
          onPick={handlePickHot}
          disabled={loading}
        />

        {error && (
          <div className="error-banner">
            <span>⚠ {error}</span>
          </div>
        )}

        {(loading || result) && (
          <AgentFlow statuses={statuses} loading={loading} keyword={result?.keyword || activeKeyword} />
        )}

        {/* 报告生成中：实时展示 DeepSeek 思考 + 撰写过程 */}
        {loading && (thinking || streamReport) && (
          <section className="card stream-panel">
            <h2 className="card-title">
              <span className="title-bar" />
              报告生成中
              <span className="live-tag">实时</span>
            </h2>
            {thinking && (
              <details className="thinking-box" open>
                <summary>💭 模型思考过程</summary>
                <pre className="thinking-text">{thinking}</pre>
              </details>
            )}
            {streamReport && (
              <pre className="stream-text">
                {streamReport}
                <span className="type-caret" />
              </pre>
            )}
          </section>
        )}

        <div ref={chartRef}>
          {result && (
            <>
              <ChartPanel analyze={result.analyze} trend={result.trend} />
              <ReportPanel
                report={result.report}
                debate={result.debate}
                sources={result.sources}
                result={result}
              />
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <label
          className={`demo-toggle ${demoMode ? 'on' : ''}`}
          title="无网络或未配置密钥时，用本地预置数据完整演示全流程"
        >
          <input
            type="checkbox"
            checked={demoMode}
            disabled={loading}
            onChange={(e) => {
              setDemoMode(e.target.checked)
              reset()
            }}
          />
          <span className="demo-toggle-track">
            <span className="demo-toggle-thumb" />
          </span>
          <span className="demo-toggle-text">
            离线演示模式{demoMode ? '：已开启' : ''}
          </span>
        </label>
        <p className="app-footer-text">信息与你无限，AgentMind重塑信息公平。</p>
      </footer>
    </div>
  )
}
