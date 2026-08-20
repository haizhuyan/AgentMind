/**
 * agentDetail.jsx —— 智能体中间产物渲染（流水线步骤可展开详情）
 * ---------------------------------------------------
 * 按步骤类型渲染采集来源/清洗对比/情感关键词/洞察/论坛多轮/报告等真实产物。
 */

/** 根据步骤类型渲染对应的中间产物视图 */
export function renderDetail(stepId, d) {
  // 论坛协作（运行中或已完成）：优先渲染多轮论坛进程
  if (stepId === 'debate' && (d?._forum || d?.rounds?.length)) {
    return renderForum(d)
  }

  // 运行中：展示"处理中"提示与正在协作的模型（真实产物需等该步骤完成）
  if (d && d._running) {
    const list = d.models || (d.reviewers?.length ? d.reviewers : d.model ? [d.model] : [])
    return (
      <div className="detail-running">
        <span className="detail-running-dot" />
        <span>
          {stepId === 'analyze'
            ? '多模型并行分析中…'
            : stepId === 'debate'
              ? '跨模型交叉复核中…'
              : stepId === 'report'
                ? '撰写报告中…'
                : '处理中…'}
        </span>
        {list.length > 0 && (
          <span className="detail-running-models">
            {list.map((label, i) => (
              <span key={i} className="model-badge">
                {label}
              </span>
            ))}
          </span>
        )}
      </div>
    )
  }

  switch (stepId) {
    case 'collect':
      return (
        <>
          <div className="detail-tag">
            数据来源：{d.mode}　·　样本 {d.count} 条
          </div>
          {d.sources?.length > 0 && (
            <ul className="detail-sources">
              {d.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url || '#'} target="_blank" rel="noreferrer">
                    {s.title || s.url}
                  </a>
                  {s.displayUrl && <span className="dim"> · {s.displayUrl}</span>}
                </li>
              ))}
            </ul>
          )}
          {/* {d.samples?.length > 0 && (
            <div className="detail-samples">
              {d.samples.map((t, i) => (
                <div key={i} className="sample-line">
                  {truncate(t, 120)}
                </div>
              ))}
            </div>
          )} */}
        </>
      )

    case 'clean':
      return (
        <>
          <div className="detail-tag">
            清洗前 {d.before} 条 → 清洗后 <b>{d.after}</b> 条（去重 / 去广告 / 去无效）
          </div>
          <div className="detail-samples">
            {(d.samples || []).map((t, i) => (
              <div key={i} className="sample-line">
                {truncate(t, 120)}
              </div>
            ))}
          </div>
        </>
      )

    case 'analyze': {
      const localContrib = (d.contributors || []).find((c) => c.kind === 'local')
      const modelContribs = (d.contributors || []).filter((c) => c.kind !== 'local')
      return (
        <>
          {modelContribs.length > 0 && (
            <div className="detail-tag">
              多模型协作分析：
              {modelContribs.map((c, i) => (
                <span key={i} className={`model-badge ${c.ok ? '' : 'model-badge-fail'}`}>
                  {c.ok ? '✓' : '✕'} {c.label}
                </span>
              ))}
            </div>
          )}
          {localContrib && (
            <div className="detail-tag">
              本地情感中间件：
              <span className="model-badge model-badge-local">
                🧭 {localContrib.label}
              </span>
              <span className="dim">
                词典命中覆盖 {localContrib.coverage}%（本地占比 正{localContrib.sentiment?.positive}/负
                {localContrib.sentiment?.negative}/中{localContrib.sentiment?.neutral}），已按权重与 LLM 融合校准
              </span>
            </div>
          )}
          <div className="sentiment-bars">
            <SentiBar label="正面" val={d.sentiment?.positive} color="#34c759" />
            <SentiBar label="负面" val={d.sentiment?.negative} color="#ff3b30" />
            <SentiBar label="中性" val={d.sentiment?.neutral} color="#007aff" />
          </div>
          {d.keywords?.length > 0 && (
            <div className="detail-chips">
              {d.keywords.map((k, i) => (
                <span key={i} className="chip">
                  {k.word}
                  <i>{k.weight}</i>
                </span>
              ))}
            </div>
          )}
          {d.opinions?.length > 0 && (
            <ul className="detail-list">
              {d.opinions.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          )}
        </>
      )
    }

    case 'insight':
      return (
        <>
          {d.trend && <div className="detail-tag">趋势：{d.trend}</div>}
          {d.risks?.length > 0 && (
            <div className="detail-block">
              <span className="block-label risk">风险</span>
              <ul className="detail-list">
                {d.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.demands?.length > 0 && (
            <div className="detail-block">
              <span className="block-label demand">诉求</span>
              <ul className="detail-list">
                {d.demands.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.cause && <div className="detail-cause">成因：{d.cause}</div>}
        </>
      )

    case 'debate':
      return (
        <>
          <div className="detail-tag">
            多模型交叉验证，平均一致度 <b>{d.agreement}%</b>
            {d.hasDivergence ? '（存在分歧，已二次校准）' : '（结论高度一致）'}
          </div>
          {d.reviewers?.length > 0 && (
            <div className="detail-tag">
              参与复核：
              {d.reviewers.map((r, i) => (
                <span key={i} className={`model-badge ${r.ok ? '' : 'model-badge-fail'}`}>
                  {r.ok ? `✓ ${r.label}（${r.agreement}%）` : `✕ ${r.label}`}
                </span>
              ))}
            </div>
          )}
          {d.disputes?.length > 0 && (
            <div className="detail-block">
              <span className="block-label risk">分歧点</span>
              <ul className="detail-list">
                {d.disputes.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {d.supplement?.length > 0 && (
            <div className="detail-block">
              <span className="block-label demand">补充</span>
              <ul className="detail-list">
                {d.supplement.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )

    case 'report':
      return <div className="detail-tag">报告已生成（{d.length} 字）</div>

    default:
      return null
  }
}

/**
 * 渲染论坛协作（ForumEngine）多轮进程：
 * 每一轮展示各验证 Agent 发言 + 主持人归纳（共识/分歧/下一轮问题）。
 */
function renderForum(d) {
  const rounds = Array.isArray(d.rounds) ? d.rounds : []
  const total = d.totalRounds || rounds.length
  const running = d._running

  return (
    <div className="forum-view">
      <div className="detail-tag">
        论坛协作：主持人{' '}
        {d.host && <span className="model-badge">{d.host}</span>}
        {' '}引导{' '}
        {(d.reviewers || []).map((r, i) => (
          <span key={i} className="model-badge">
            {typeof r === 'string' ? r : r.label}
          </span>
        ))}
        {' '}多轮复核
        {running && (
          <span className="forum-progress">
            （进行中 {rounds.length}/{total} 轮）
          </span>
        )}
      </div>

      {rounds.length === 0 && running && (
        <div className="detail-running">
          <span className="detail-running-dot" />
          <span>论坛发言收集中…</span>
        </div>
      )}

      {rounds.map((r) => (
        <div key={r.round} className="forum-round">
          <div className="forum-round-head">
            第 {r.round} 轮
            {typeof r.agreement === 'number' && (
              <span className="forum-agreement">一致度 {r.agreement}%</span>
            )}
          </div>

          {(r.speeches || []).map((s, i) => (
            <div key={i} className={`forum-speech ${s.ok === false ? 'fail' : ''}`}>
              <span className="forum-speaker">{s.label}</span>
              <span className="forum-content">{s.content}</span>
            </div>
          ))}

          {r.host && (
            <div className="forum-host">
              <div className="forum-host-tag">🎙 主持人归纳</div>
              {r.host.summary && <p className="forum-host-summary">{r.host.summary}</p>}
              {r.host.consensus?.length > 0 && (
                <div className="forum-host-block">
                  <span className="block-label demand">共识</span>
                  <ul className="detail-list">
                    {r.host.consensus.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r.host.divergences?.length > 0 && (
                <div className="forum-host-block">
                  <span className="block-label risk">分歧</span>
                  <ul className="detail-list">
                    {r.host.divergences.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r.host.questions?.length > 0 && (
                <div className="forum-host-block">
                  <span className="block-label">下一轮追问</span>
                  <ul className="detail-list">
                    {r.host.questions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!running && d.trace && (
        <div className="forum-trace">
          <b>结论溯源：</b>
          {d.trace}
        </div>
      )}
    </div>
  )
}

function SentiBar({ label, val = 0, color }) {
  return (
    <div className="senti-bar-row">
      <span className="senti-label">{label}</span>
      <div className="senti-track">
        <div className="senti-fill" style={{ width: `${val}%`, background: color }} />
      </div>
      <span className="senti-val">{val}%</span>
    </div>
  )
}

function truncate(s = '', n = 100) {
  return s.length > n ? s.slice(0, n) + '…' : s
}
