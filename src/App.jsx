import { useState, useRef, useEffect } from 'react'
import InputPanel from './components/InputPanel.jsx'
import AgentFlow from './components/AgentFlow.jsx'
import ChartPanel from './components/ChartPanel.jsx'
import ReportPanel from './components/ReportPanel.jsx'
import { runAgentFlow } from './services/agentOrchestrator.js'
import './App.css'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [statuses, setStatuses] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [streamReport, setStreamReport] = useState('')
  const [thinking, setThinking] = useState('')

  const chartRef = useRef(null)

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
      const data = await runAgentFlow({
        keyword,
        rawText,
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
