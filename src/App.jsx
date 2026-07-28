import { useState, useRef, useEffect } from 'react'
import InputPanel from './components/InputPanel.jsx'
import AgentFlow from './components/AgentFlow.jsx'
import ChartPanel from './components/ChartPanel.jsx'
import ReportPanel from './components/ReportPanel.jsx'
import HotList from './components/HotList.jsx'
import { runAgentFlow } from './services/agentOrchestrator.js'
import { fetchModels } from './services/llmService.js'
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

  const chartRef = useRef(null)

  // 启动时拉取后端已配置的模型，默认全选（全部参与协作）
  useEffect(() => {
    fetchModels().then((list) => {
      setModels(list)
      setSelectedIds(list.map((m) => m.id))
    })
  }, [])

  function toggleModel(id) {
    setSelectedIds((prev) => {
      // 至少保留一个模型
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev
      }
      // 保持与 models 同顺序（第一个选中的为主模型）
      return models.map((m) => m.id).filter((x) => prev.includes(x) || x === id)
    })
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
    try {
      const chosen = models.filter((m) => selectedIds.includes(m.id))
      const data = await runAgentFlow({
        keyword,
        rawText,
        models: chosen,
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
        />

        <HotList
          onPick={(keyword) => handleAnalyze({ keyword })}
          disabled={loading}
        />

        {error && (
          <div className="error-banner">
            <span>⚠ {error}</span>
          </div>
        )}

        {(loading || result) && (
          <AgentFlow statuses={statuses} loading={loading} />
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
        AgentMind
      </footer>
    </div>
  )
}
