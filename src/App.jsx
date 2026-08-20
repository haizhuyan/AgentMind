import { useState, useEffect, useRef } from 'react'
import LoginModal from './components/LoginModal.jsx'
import Landing from './landing/Landing.jsx'
import Workbench from './workbench/Workbench.jsx'
import { runAgentFlow } from './services/agentOrchestrator.js'
import { fetchModels } from './services/llmService.js'
import { useDemoMode } from './services/demoMode.js'
import { DEFAULT_TEMPLATE_ID } from './report/templates.js'
import { MINDSPIDER_CONFIG } from './config.js'
import { parseNaturalLanguage } from './utils/nlpParser.js'
import { loadHistory, saveHistory, removeHistoryItem, clearHistory } from './utils/historyStore.js'
import {
  getToken,
  setToken,
  setUnauthorizedHandler,
  apiMe,
  apiListRecords,
  apiGetRecord,
  apiCreateRecord,
  apiUpdateRecordStep,
  apiFinishRecord,
  apiDeleteRecord,
  apiCreateCrawlJob,
  apiGetCrawlJob
} from './services/api.js'
import './App.css'

/** 极简 hash 路由：'' / '#/' = 落地首页；'#/app' = 工作台 */
function useHashRoute() {
  const [route, setRoute] = useState(() =>
    window.location.hash === '#/app' ? 'app' : 'landing'
  )
  useEffect(() => {
    const onChange = () =>
      setRoute(window.location.hash === '#/app' ? 'app' : 'landing')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()

  // ---------- 账号 ----------
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [viewRecord, setViewRecord] = useState(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  // 当前对话的记录 id（登录用户每次分析对应一条服务端记录；新建对话时为 null）
  const [activeRecordId, setActiveRecordId] = useState(null)
  // 当前对话的步骤态 + 流水线快照（增量持久化，用于断点续跑）
  const stepStateRef = useRef({ state: {}, pipeline: {} })
  // 落地页「开始分析」携带的内容（登录后自动开始）
  const [pendingPrompt, setPendingPrompt] = useState('')
  // 全局通知横幅（如：爬虫任务完成）
  const [notice, setNotice] = useState('')

  // ---------- 分析工作台状态 ----------
  const [loading, setLoading] = useState(false)
  const [statuses, setStatuses] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [streamReport, setStreamReport] = useState('')
  const [thinking, setThinking] = useState('')
  const [models, setModels] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [primaryId, setPrimaryId] = useState('')
  const [seedKeyword, setSeedKeyword] = useState(null)
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID)
  const [demoMode, setDemoMode] = useDemoMode()
  const [activeKeyword, setActiveKeyword] = useState('')
  const [history, setHistory] = useState([])
  const [collectSource, setCollectSource] = useState(MINDSPIDER_CONFIG.source)
  const [collectPlatform, setCollectPlatform] = useState(MINDSPIDER_CONFIG.platform)

  // ---------- 会话恢复与 401 处理 ----------
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setRecords([])
      window.location.hash = ''
    })
    if (getToken()) {
      apiMe()
        .then((data) => {
          if (data?.user) setUser(data.user)
        })
        .catch(() => {
          /* 401 已由拦截器处理 */
        })
    }
  }, [])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // 通知横幅自动消失
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 8000)
    return () => clearTimeout(timer)
  }, [notice])

  // 登录用户加载服务端记录
  useEffect(() => {
    if (user) {
      apiListRecords().then(setRecords).catch(() => {})
    } else {
      setRecords([])
      setViewRecord(null)
    }
  }, [user])

  // 启动时 & 切换离线演示模式时：拉取模型列表
  useEffect(() => {
    fetchModels().then((list) => {
      setModels(list)
      setSelectedIds(list.map((m) => m.id))
      if (list.length) setPrimaryId(list[0].id)
    })
  }, [demoMode])

  function toggleModel(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev
        const next = prev.filter((x) => x !== id)
        if (id === primaryId) {
          const fallback = models.map((m) => m.id).find((x) => next.includes(x))
          if (fallback) setPrimaryId(fallback)
        }
        return next
      }
      return models.map((m) => m.id).filter((x) => prev.includes(x) || x === id)
    })
  }

  function setPrimary(id) {
    setPrimaryId(id)
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev
        : models.map((m) => m.id).filter((x) => prev.includes(x) || x === id)
    )
  }

  function reset() {
    setResult(null)
    setStatuses({})
    setError('')
    setStreamReport('')
    setThinking('')
  }

  // 新建对话：清空当前会话（默认新用户进入即处于此状态）
  function handleNewChat() {
    if (loading) return
    reset()
    setViewRecord(null)
    setActiveRecordId(null)
    setActiveKeyword('')
    setSeedKeyword(null)
    stepStateRef.current = { state: {}, pipeline: {} }
  }

  async function handleAnalyze({ keyword, rawText, resume }) {
    reset()
    setViewRecord(null)
    setLoading(true)
    setError('')
    setActiveKeyword(keyword || '')
    if (keyword) setHistory(saveHistory(keyword))

    // 断点续跑：恢复已保存的步骤态，让聊天流立即显示已完成步骤
    if (resume?.stepDetails) {
      const restored = {}
      Object.entries(resume.stepDetails).forEach(([stepId, s]) => {
        if (s?.status) restored[stepId] = { status: s.status, detail: s.detail }
      })
      setStatuses(restored)
    }

    // 创建/沿用对话记录（登录用户）
    let recordId = resume?.recordId || null
    if (user && !recordId && keyword) {
      try {
        const rec = await apiCreateRecord({
          keyword,
          source: collectSource,
          platform: collectSource === 'mindspider' ? collectPlatform : ''
        })
        recordId = rec?.id || null
      } catch {
        /* 创建失败不阻塞分析 */
      }
    }
    setActiveRecordId(recordId)
    if (!resume) stepStateRef.current = { state: {}, pipeline: {} }

    // 抽取公共：执行流水线（含步骤增量持久化）
    const runPipeline = async (pipelineResume) => {
      const chosen = models.filter((m) => selectedIds.includes(m.id))
      const ordered = [
        ...chosen.filter((m) => m.id === primaryId),
        ...chosen.filter((m) => m.id !== primaryId)
      ]
      const data = await runAgentFlow({
        keyword,
        rawText,
        models: ordered,
        templateId,
        collectSource,
        collectPlatform,
        resume: pipelineResume,
        onStep: (stepId, status, detail, pipeline) => {
          setStatuses((prev) => ({
            ...prev,
            [stepId]: { status, detail: detail ?? prev[stepId]?.detail }
          }))
          // 增量持久化：步骤态 + 流水线快照（断点续跑的数据基础）
          stepStateRef.current.state[stepId] = { status, detail }
          if (pipeline) stepStateRef.current.pipeline = pipeline
          if (user && recordId) {
            apiUpdateRecordStep(recordId, {
              stepState: stepStateRef.current.state,
              pipeline: stepStateRef.current.pipeline
            }).catch(() => {})
          }
        },
        onReport: (evt, text) => {
          if (evt === 'token') setStreamReport((prev) => prev + text)
          else if (evt === 'reasoning') setThinking((prev) => prev + text)
        }
      })
      setResult(data)
      // 分析最终完成：清空输入框
      setSeedKeyword({ value: '' })
      if (user && recordId) {
        apiFinishRecord(recordId, 'completed', data)
          .then(async () => setRecords(await apiListRecords()))
          .catch(() => {})
      }
    }

    try {
      // ---- MindSpider 爬虫：异步任务流（提交任务 → 后台队列 → 完成后通知并接续流水线）----
      // 仅登录用户走任务队列（演示模式无后端）；粘贴文本/续跑已有数据时直接跑流水线。
      const isCrawlMode = user && collectSource === 'mindspider' && !rawText
      if (isCrawlMode) {
        // 待恢复的爬虫任务（断点续跑：collect 步骤记录过 jobId 且任务未完成）
        const savedCollect = resume?.stepDetails?.collect
        let jobId = savedCollect?.detail?.jobId
        let job = null

        if (jobId) {
          job = await apiGetCrawlJob(jobId).catch(() => null)
          if (!job || job.status === 'failed') {
            // 原任务失效：重新提交
            jobId = null
            job = null
          }
        }
        if (!jobId) {
          const created = await apiCreateCrawlJob({
            keyword,
            platform: collectPlatform || MINDSPIDER_CONFIG.platform,
            maxNotes: MINDSPIDER_CONFIG.maxNotes
          })
          jobId = created?.id
          if (!jobId) throw new Error('爬虫任务提交失败，请检查后端 MindSpider 配置。')
          job = { status: 'queued', progress: '排队中' }
        }

        // collect 步骤进入「后台执行」状态并持久化（断点续跑可恢复）
        const persistCollect = (status, detail) => {
          setStatuses((prev) => ({ ...prev, collect: { status, detail } }))
          stepStateRef.current.state.collect = { status, detail }
          if (user && recordId) {
            apiUpdateRecordStep(recordId, {
              stepState: stepStateRef.current.state,
              pipeline: stepStateRef.current.pipeline
            }).catch(() => {})
          }
        }
        persistCollect('running', {
          _running: true,
          mode: '爬虫任务后台执行中（无头模式）',
          count: 0,
          jobId
        })

        // 轮询任务状态
        while (job && (job.status === 'queued' || job.status === 'running')) {
          await new Promise((r) => setTimeout(r, 3000))
          job = await apiGetCrawlJob(jobId).catch(() => null)
          if (!job) throw new Error('爬虫任务丢失，请重试。')
          persistCollect('running', {
            _running: true,
            mode: `爬虫任务后台执行中（${job.progress || job.status}）`,
            count: 0,
            jobId
          })
        }

        if (job.status !== 'completed' || !job.result?.texts?.length) {
          throw new Error(job.error || '爬虫任务失败：未获取到内容，可换关键词重试。')
        }

        // 完成后通知 + 保存采集产物 + 接续流水线（跳过采集步骤）
        setNotice(`✅ 爬虫任务完成：${job.result.texts.length} 条样本，流水线继续执行`)
        persistCollect('done', {
          count: job.result.texts.length,
          mode: `MindSpider 爬虫（${collectPlatform || 'weibo'}）`,
          sources: (job.result.sources || []).slice(0, 8),
          samples: job.result.texts.slice(0, 8)
        })
        await runPipeline({
          pipeline: { raw: job.result.texts, sources: job.result.sources || [] },
          stepDetails: {
            collect: {
              status: 'done',
              detail: stepStateRef.current.state.collect.detail
            }
          }
        })
      } else {
        await runPipeline(
          resume
            ? { pipeline: resume.pipeline || {}, stepDetails: resume.stepDetails || {} }
            : undefined
        )
      }
    } catch (err) {
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
      // 失败收尾：保留流水线快照，供「继续」断点续跑
      if (user && recordId) {
        apiFinishRecord(recordId, 'failed')
          .then(async () => setRecords(await apiListRecords()))
          .catch(() => {})
      }
    } finally {
      setLoading(false)
    }
  }

  function handlePickKeyword(keyword) {
    const kw = String(keyword || '').trim()
    if (!kw || loading) return
    setSeedKeyword({ value: kw })
    handleAnalyze({ keyword: kw })
  }

  function handleRemoveHistory(keyword) {
    setHistory(removeHistoryItem(keyword))
  }

  function handleClearHistory() {
    setHistory(clearHistory())
  }

  // ---------- 账号操作 ----------
  // 登录成功进入工作台：携带内容 → 填入输入框并自动开始；无内容 → 清空输入框
  function handleLogin(userInfo) {
    setUser(userInfo)
    setLoginModalOpen(false)
    if (pendingPrompt) {
      setSeedKeyword({ value: pendingPrompt })
    } else {
      setSeedKeyword(null)
    }
    window.location.hash = '#/app'
  }

  // 「登录 / 免费体验 / 立即免费体验」统一弹登录框
  function handleFreeTrial() {
    setLoginModalOpen(true)
  }

  // 弹窗内「暂不登录，先离线体验」→ 离线演示工作台（清空输入框残留）
  function handleDemoEnter() {
    setDemoMode(true)
    setLoginModalOpen(false)
    setSeedKeyword(null)
    window.location.hash = '#/app'
  }

  // 打开登录弹窗（正常流程入口）
  function handleLoginClick() {
    setLoginModalOpen(true)
  }

  // Hero「开始分析」：携带输入内容。已登录 → 进工作台并自动开始；
  // 未登录 → 记住内容并弹登录框，登录后自动开始。
  function handleStartAnalyze(content) {
    const text = String(content || '').trim()
    setPendingPrompt(text)
    setSeedKeyword(text ? { value: text } : null)
    if (user) {
      window.location.hash = '#/app'
    } else {
      setLoginModalOpen(true)
    }
  }

  // 关闭登录弹窗：留在原地（首页），并丢弃携带的分析内容
  function handleModalClose() {
    setLoginModalOpen(false)
    setPendingPrompt('')
  }

  // 首页「进入工作台」/「登录状态」点击（清空输入框残留）
  function handleEnterWorkspace() {
    setSeedKeyword(null)
    window.location.hash = '#/app'
  }

  // 登录后自动开始携带的分析内容（等模型列表就绪后执行一次）
  const pendingStartedRef = useRef(false)
  useEffect(() => {
    if (!pendingPrompt || !user || loading) return
    if (!models.length) return
    if (pendingStartedRef.current) return
    pendingStartedRef.current = true
    const raw = pendingPrompt
    setPendingPrompt('')
    if (raw.includes('\n') || raw.length >= 50) {
      handleAnalyze({ keyword: raw.slice(0, 20), rawText: raw })
    } else {
      const parsed = parseNaturalLanguage(raw)
      handleAnalyze({ keyword: parsed.keyword || raw, dimensions: parsed.dimensions, rawInput: raw })
    }
  }, [pendingPrompt, user, models, loading])

  // 工作台演示开关：关闭且未登录 → 回首页；已登录 → 留在工作台
  function handleToggleDemo(next) {
    setDemoMode(next)
    reset()
    if (!next && !user) {
      window.location.hash = ''
    }
  }

  // 工作台登录态点击：已登录 → 退出登录回首页；演示 → 回首页弹登录框
  function handleLoginStatusClick() {
    if (user) {
      handleLogout()
    } else {
      setDemoMode(false)
      window.location.hash = ''
      setLoginModalOpen(true)
    }
  }

  // 侧边栏 AgentMind logo 点击 → 返回首页
  function handleHome() {
    window.location.hash = ''
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    setDemoMode(false)
    setRecords([])
    setViewRecord(null)
    setLoginModalOpen(false)
    setPendingPrompt('')
    setSeedKeyword(null)
    reset()
    window.location.hash = ''
  }

  // 打开历史记录：已完成 → 全量回放（含步骤中间产物，不重跑）；未完成/失败 → 断点续跑
  async function handleOpenRecord(id) {
    if (loading) return
    try {
      const record = await apiGetRecord(id)
      if (!record) return
      if (record.status === 'completed' && record.result) {
        reset()
        setViewRecord(record)
      } else {
        await handleResumeRecord(record)
      }
    } catch (err) {
      setError(err.message || '记录加载失败')
    }
  }

  // 未完成（running/failed）记录的断点续跑：恢复步骤态与流水线快照，从断点继续
  async function handleResumeRecord(record) {
    if (loading) return
    setActiveRecordId(record.id)
    setActiveKeyword(record.keyword || '')
    setCollectSource(record.source === 'mindspider' ? 'mindspider' : 'search')
    if (record.platform) setCollectPlatform(record.platform)
    await handleAnalyze({
      keyword: record.keyword,
      resume: {
        recordId: record.id,
        pipeline: record.pipeline || {},
        stepDetails: record.step_state || {}
      }
    })
  }

  async function handleDeleteRecord(id) {
    try {
      await apiDeleteRecord(id)
      if (viewRecord?.id === id) setViewRecord(null)
      setRecords(await apiListRecords())
    } catch (err) {
      setError(err.message || '删除失败')
    }
  }

  // ---------- 路由守卫 ----------
  const workspaceVisible = Boolean(user) || demoMode
  if (route !== 'app' || !workspaceVisible) {
    return (
      <>
        <Landing
          user={user}
          onLoginClick={handleLoginClick}
          onFreeTrial={handleFreeTrial}
          onStartAnalyze={handleStartAnalyze}
          onDemo={handleDemoEnter}
          onEnterWorkspace={handleEnterWorkspace}
        />
        {loginModalOpen && (
          <LoginModal
            onSuccess={handleLogin}
            onClose={handleModalClose}
            onDemo={handleDemoEnter}
          />
        )}
      </>
    )
  }

  return (
    <Workbench
      user={user}
      demoMode={demoMode}
      loading={loading}
      statuses={statuses}
      result={result}
      viewRecord={viewRecord}
      streamReport={streamReport}
      thinking={thinking}
      error={error}
      activeKeyword={activeKeyword}
      records={records}
      history={history}
      models={models}
      primaryId={primaryId}
      onSetPrimary={setPrimary}
      templateId={templateId}
      onSelectTemplate={setTemplateId}
      collectSource={collectSource}
      collectPlatform={collectPlatform}
      onSourceChange={setCollectSource}
      onPlatformChange={setCollectPlatform}
      seedKeyword={seedKeyword}
      onNewChat={handleNewChat}
      onOpenRecord={handleOpenRecord}
      onDeleteRecord={handleDeleteRecord}
      onPickKeyword={handlePickKeyword}
      onRemoveHistory={handleRemoveHistory}
      onClearHistory={handleClearHistory}
      onToggleDemo={handleToggleDemo}
      onLoginStatusClick={handleLoginStatusClick}
      onAnalyze={handleAnalyze}
      onHome={handleHome}
      onLogout={handleLogout}
      notice={notice}
      onDismissNotice={() => setNotice('')}
      activeRecordId={activeRecordId}
    />
  )
}
