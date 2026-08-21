import { useState, useEffect, useRef } from 'react'
import LoginModal from './components/LoginModal.jsx'
import Landing from './landing/Landing.jsx'
import Workbench from './workbench/Workbench.jsx'
import { runAgentFlow } from './services/agentOrchestrator.js'
import { fetchModels, setLLMAbortSignal, isAbortError, createAbortError, sleep, callLLM } from './services/llmService.js'
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
  /** 报告完成后的追问对话（同会话，不新开流水线） */
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
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
  const abortRef = useRef(null)
  const runIdRef = useRef(0)

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

  // 离开工作台（回首页）时暂停进行中的分析
  useEffect(() => {
    if (route !== 'app' && abortRef.current) {
      pauseCurrentRun({ persist: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

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
    setChatMessages([])
    setChatLoading(false)
  }

  /**
   * 暂停当前分析：中断请求、结束 loading，并把进行中记录收尾为 failed（可断点续跑）。
   * 切换会话 / 回首页 / 新建对话时调用。仅在确有运行中的任务时写回 failed。
   */
  function pauseCurrentRun({ persist = true } = {}) {
    const recordId = activeRecordId
    const wasRunning = Boolean(abortRef.current)
    const snapshot = {
      state: { ...stepStateRef.current.state },
      pipeline: stepStateRef.current.pipeline ? { ...stepStateRef.current.pipeline } : {}
    }
    runIdRef.current += 1
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setLLMAbortSignal(null)
    setLoading(false)

    if (!wasRunning) return

    Object.keys(snapshot.state).forEach((k) => {
      if (snapshot.state[k]?.status === 'running') {
        snapshot.state[k] = { ...snapshot.state[k], status: 'failed' }
      }
    })
    stepStateRef.current.state = snapshot.state

    if (persist && user && recordId) {
      apiUpdateRecordStep(recordId, {
        stepState: snapshot.state,
        pipeline: snapshot.pipeline
      }).catch(() => {})
      apiFinishRecord(recordId, 'failed')
        .then(async () => setRecords(await apiListRecords()))
        .catch(() => {})
    }
  }

  // 新建对话：先暂停当前会话，再清空工作区
  function handleNewChat() {
    pauseCurrentRun({ persist: true })
    reset()
    setViewRecord(null)
    setActiveRecordId(null)
    setActiveKeyword('')
    setSeedKeyword(null)
    stepStateRef.current = { state: {}, pipeline: {} }
  }

  function handleStop() {
    // 停止 = 暂停当前会话（保留步骤产物，可手动继续）
    if (!loading && !abortRef.current) return
    pauseCurrentRun({ persist: true })
    setStatuses((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        if (next[k]?.status === 'running') {
          next[k] = { ...next[k], status: 'failed' }
        }
      })
      return next
    })
    setError('分析已暂停。可点击「继续分析」从断点重试。')
  }

  async function handleAnalyze({ keyword, rawText, resume }) {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLLMAbortSignal(ac.signal)
    const runId = ++runIdRef.current

    // 新开分析清空结果；续跑则先恢复步骤态
    setResult(null)
    setStreamReport('')
    setThinking('')
    setError('')
    setViewRecord(null)
    setLoading(true)
    setActiveKeyword(keyword || '')
    if (!resume) setChatMessages([])
    if (keyword) setHistory(saveHistory(keyword))

    if (resume?.stepDetails) {
      const forUi = {}
      Object.entries(resume.stepDetails).forEach(([stepId, s]) => {
        if (!s?.status) return
        // 已完成步骤保持 done；失败/中断步骤显示为 pending，由流水线重跑
        if (s.status === 'done') forUi[stepId] = { status: 'done', detail: s.detail }
        else forUi[stepId] = { status: 'pending', detail: s.detail }
      })
      setStatuses(forUi)
    } else {
      setStatuses({})
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
    else {
      stepStateRef.current = {
        state: { ...(resume.stepDetails || {}) },
        pipeline: { ...(resume.pipeline || {}) }
      }
    }

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
        signal: ac.signal,
        onStep: (stepId, status, detail, pipeline) => {
          setStatuses((prev) => ({
            ...prev,
            [stepId]: { status, detail: detail ?? prev[stepId]?.detail }
          }))
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
      setSeedKeyword({ value: '' })
      setError('')
      if (user && recordId) {
        apiFinishRecord(recordId, 'completed', data)
          .then(async () => setRecords(await apiListRecords()))
          .catch(() => {})
      }
    }

    try {
      const isCrawlMode = user && collectSource === 'mindspider' && !rawText
      if (isCrawlMode) {
        const savedCollect = resume?.stepDetails?.collect
        let jobId = savedCollect?.detail?.jobId
        let job = null

        // 采集已成功则跳过爬虫，直接续跑后续步骤
        const collectDone =
          savedCollect?.status === 'done' &&
          Array.isArray(resume?.pipeline?.raw) &&
          resume.pipeline.raw.length > 0

        if (collectDone) {
          await runPipeline({
            pipeline: resume.pipeline || {},
            stepDetails: resume.stepDetails || {}
          })
        } else {
          if (jobId) {
            job = await apiGetCrawlJob(jobId).catch(() => null)
            if (!job || job.status === 'failed') {
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

          while (job && (job.status === 'queued' || job.status === 'running')) {
            if (ac.signal.aborted) throw createAbortError()
            await sleep(3000, ac.signal)
            job = await apiGetCrawlJob(jobId).catch(() => null)
            if (ac.signal.aborted) throw createAbortError()
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
              ...(resume?.stepDetails || {}),
              collect: {
                status: 'done',
                detail: stepStateRef.current.state.collect.detail
              }
            }
          })
        }
      } else {
        // 续跑：只把 done 的步骤交给 orchestrator；failed 不作为 done
        let pipelineResume
        if (resume) {
          const stepDetails = {}
          Object.entries(resume.stepDetails || {}).forEach(([id, s]) => {
            if (s?.status === 'done') stepDetails[id] = s
          })
          pipelineResume = {
            pipeline: resume.pipeline || {},
            stepDetails
          }
        }
        await runPipeline(pipelineResume)
      }
    } catch (err) {
      if (runId !== runIdRef.current) return
      setStatuses((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          if (next[k]?.status === 'running') {
            next[k] = { ...next[k], status: 'failed' }
          }
        })
        return next
      })
      Object.keys(stepStateRef.current.state).forEach((k) => {
        if (stepStateRef.current.state[k]?.status === 'running') {
          stepStateRef.current.state[k] = {
            ...stepStateRef.current.state[k],
            status: 'failed'
          }
        }
      })
      const paused = isAbortError(err)
      setError(
        paused
          ? '分析已暂停。可点击「继续分析」从断点重试。'
          : `${err.message || '分析过程发生异常'}。可点击「继续分析」重试。`
      )
      if (user && recordId) {
        apiUpdateRecordStep(recordId, {
          stepState: stepStateRef.current.state,
          pipeline: stepStateRef.current.pipeline
        }).catch(() => {})
        apiFinishRecord(recordId, 'failed')
          .then(async () => setRecords(await apiListRecords()))
          .catch(() => {})
      }
    } finally {
      if (runId === runIdRef.current) {
        setLoading(false)
        if (abortRef.current === ac) abortRef.current = null
        setLLMAbortSignal(null)
      }
    }
  }

  function handlePickKeyword(keyword) {
    const kw = String(keyword || '').trim()
    if (!kw || loading || chatLoading) return
    setSeedKeyword({ value: kw })
    handleAnalyze({ keyword: kw })
  }

  /**
   * 报告完成后的自然语言追问：基于当前报告继续讨论，不新开流水线。
   */
  async function handleChat({ message }) {
    const msg = String(message || '').trim()
    const reportData = result || viewRecord?.result
    if (!msg || !reportData || loading || chatLoading) return

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: msg }
    setChatMessages((prev) => [...prev, userMsg])
    setChatLoading(true)

    const reportText = String(reportData.report || '').slice(0, 8000)
    const kw = reportData.keyword || activeKeyword || ''
    const historyLines = [...chatMessages, userMsg]
      .slice(-8)
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n')

    try {
      const primary = models.find((m) => m.id === primaryId) || models[0]
      const reply = await callLLM({
        system: `你是 AgentMind 舆情分析助手。用户已完成关于「${kw}」的舆情分析报告，请基于报告内容回答追问，不要重新采集或编造报告外的权威数据。回答简洁、可执行，必要处引用报告观点。若问题与报告无关，礼貌说明并引导回到报告议题。`,
        user: `【报告正文】\n${reportText || '（报告正文为空，请根据已知分析结论作答）'}\n\n【近期对话】\n${historyLines || '（无）'}\n\n【本轮用户问题】\n${msg}`,
        model: primary?.id,
        json: false,
        temperature: 0.5
      })
      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: String(reply || '').trim() || '（未生成有效回复）' }
      ])
    } catch (err) {
      if (isAbortError(err)) {
        setChatMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: '追问已取消。' }
        ])
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: `追问失败：${err?.message || '未知错误'}。可稍后重试。`
          }
        ])
      }
    } finally {
      setChatLoading(false)
    }
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
    pauseCurrentRun({ persist: true })
    setDemoMode(next)
    reset()
    setViewRecord(null)
    setActiveRecordId(null)
    if (!next && !user) {
      window.location.hash = ''
    }
  }

  // 工作台登录态点击：已登录 → 退出登录回首页；演示 → 回首页弹登录框
  function handleLoginStatusClick() {
    pauseCurrentRun({ persist: true })
    if (user) {
      handleLogout()
    } else {
      setDemoMode(false)
      window.location.hash = ''
      setLoginModalOpen(true)
    }
  }

  // 侧边栏 AgentMind logo 点击 → 暂停后返回首页
  function handleHome() {
    pauseCurrentRun({ persist: true })
    window.location.hash = ''
  }

  function handleLogout() {
    pauseCurrentRun({ persist: false })
    setToken('')
    setUser(null)
    setDemoMode(false)
    setRecords([])
    setViewRecord(null)
    setActiveRecordId(null)
    setLoginModalOpen(false)
    setPendingPrompt('')
    setSeedKeyword(null)
    reset()
    window.location.hash = ''
  }

  /** 将服务端 step_state 转为界面 statuses */
  function statusesFromStepState(stepState = {}) {
    const restored = {}
    Object.entries(stepState).forEach(([stepId, s]) => {
      if (s?.status) restored[stepId] = { status: s.status, detail: s.detail }
    })
    return restored
  }

  // 打开历史记录：已完成 → 回看；未完成/失败 → 仅展示快照，不自动重跑（需手动「继续分析」）
  async function handleOpenRecord(id) {
    pauseCurrentRun({ persist: true })
    try {
      const record = await apiGetRecord(id)
      if (!record) return

      setStreamReport('')
      setThinking('')
      setResult(null)
      setChatMessages([])
      setChatLoading(false)
      setActiveRecordId(record.id)
      setActiveKeyword(record.keyword || '')
      setCollectSource(record.source === 'mindspider' ? 'mindspider' : 'search')
      if (record.platform) setCollectPlatform(record.platform)

      if (record.status === 'completed' && record.result) {
        setError('')
        setStatuses(statusesFromStepState(record.step_state))
        stepStateRef.current = {
          state: record.step_state || {},
          pipeline: record.pipeline || {}
        }
        setViewRecord(record)
        return
      }

      // 暂停 / 失败 / 未完成：展示流水线快照，等待用户手动继续
      const stepState = { ...(record.step_state || {}) }
      Object.keys(stepState).forEach((k) => {
        if (stepState[k]?.status === 'running') {
          stepState[k] = { ...stepState[k], status: 'failed' }
        }
      })
      const snapshot = {
        ...record,
        status: record.status === 'completed' ? 'completed' : 'failed',
        step_state: stepState
      }
      setViewRecord(snapshot)
      setStatuses(statusesFromStepState(stepState))
      stepStateRef.current = {
        state: stepState,
        pipeline: { ...(record.pipeline || {}) }
      }
      setError('该分析已暂停或未完成。可点击「继续分析」从断点重试。')
      // 把仍标 running 的旧记录收尾为 failed，避免下次误判
      if (user && record.id && record.status === 'running') {
        apiUpdateRecordStep(record.id, {
          stepState,
          pipeline: record.pipeline || {}
        }).catch(() => {})
        apiFinishRecord(record.id, 'failed')
          .then(async () => setRecords(await apiListRecords()))
          .catch(() => {})
      }
    } catch (err) {
      setError(err.message || '记录加载失败')
    }
  }

  // 手动继续：从当前失败/暂停会话断点续跑
  async function handleRetry() {
    if (loading) return
    const record = viewRecord && viewRecord.status !== 'completed' ? viewRecord : null
    if (record) {
      await handleResumeRecord(record)
      return
    }
    const keyword = activeKeyword
    if (!keyword) return
    const stepDetails = { ...stepStateRef.current.state }
    const pipeline = { ...(stepStateRef.current.pipeline || {}) }
    await handleAnalyze({
      keyword,
      resume: {
        recordId: activeRecordId || undefined,
        pipeline,
        stepDetails
      }
    })
  }

  // 未完成记录的断点续跑（仅由「继续分析」触发）
  async function handleResumeRecord(record) {
    if (loading) return
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
      if (activeRecordId === id) pauseCurrentRun({ persist: false })
      await apiDeleteRecord(id)
      if (viewRecord?.id === id) setViewRecord(null)
      if (activeRecordId === id) {
        setActiveRecordId(null)
        reset()
      }
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
      chatMessages={chatMessages}
      chatLoading={chatLoading}
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
      onChat={handleChat}
      onStop={handleStop}
      onRetry={handleRetry}
      onHome={handleHome}
      onLogout={handleLogout}
      notice={notice}
      onDismissNotice={() => setNotice('')}
      activeRecordId={activeRecordId}
    />
  )
}
