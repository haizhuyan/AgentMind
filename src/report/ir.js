/**
 * report/ir.js —— 报告中间表示（Document IR）
 * ---------------------------------------------------
 * 参考 BettaFish 的 ReportEngine/ir：将报告统一为结构化的中间表示，
 * 从而可校验、可多格式渲染（交互式 HTML / 打印 PDF / 纯文本）。
 *
 * IR 结构：
 * {
 *   meta: { keyword, templateId, templateName, generatedAt, accent, riskLevel },
 *   sections: [
 *     { id, title, blocks: [
 *       { type: 'paragraph', text },
 *       { type: 'list', ordered: boolean, items: string[] },
 *       { type: 'quote', text }
 *     ] }
 *   ]
 * }
 */

// 合法的块类型
export const BLOCK_TYPES = ['paragraph', 'list', 'quote']

/** 生成用于锚点的 slug */
function slugify(s = '', i = 0) {
  const base = String(s)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base ? `sec-${base}-${i}` : `sec-${i}`
}

/**
 * 将报告 Markdown 解析为 Document IR。
 * 规则：`## 标题` 起一个章节；`> ` 引用；`- / * / 1.` 列表；其余非空行为段落。
 * 顶层 `# 标题` 视为文档标题（并入 meta.title，不产生章节）。
 * @param {string} markdown
 * @param {Object} [meta] 附加元信息（keyword/templateId 等）
 * @returns {{meta:Object, sections:Array}}
 */
export function markdownToIR(markdown = '', meta = {}) {
  const lines = String(markdown).split('\n')
  const sections = []
  let current = null
  let listBuf = null // { ordered, items }
  let docTitle = ''

  const flushList = () => {
    if (listBuf && listBuf.items.length && current) {
      current.blocks.push({ type: 'list', ordered: listBuf.ordered, items: listBuf.items })
    }
    listBuf = null
  }

  const ensureSection = (title) => {
    flushList()
    current = { id: slugify(title, sections.length), title: title || `章节 ${sections.length + 1}`, blocks: [] }
    sections.push(current)
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      flushList()
      continue
    }

    // 文档标题
    if (/^#\s+/.test(t)) {
      docTitle = t.replace(/^#\s+/, '')
      continue
    }
    // 章节标题（## 或 ###）
    if (/^#{2,4}\s+/.test(t)) {
      ensureSection(t.replace(/^#{2,4}\s+/, ''))
      continue
    }

    // 尚无章节时，自动开一个"正文"章节，避免内容丢失
    if (!current) ensureSection('正文')

    // 引用
    if (/^>\s?/.test(t)) {
      flushList()
      current.blocks.push({ type: 'quote', text: t.replace(/^>\s?/, '') })
      continue
    }
    // 列表项
    const ordered = /^\d+\.\s/.test(t)
    if (ordered || /^[-*]\s/.test(t)) {
      const item = t.replace(/^\d+\.\s/, '').replace(/^[-*]\s/, '')
      if (!listBuf) listBuf = { ordered, items: [] }
      listBuf.items.push(item)
      continue
    }
    // 段落
    flushList()
    current.blocks.push({ type: 'paragraph', text: t })
  }
  flushList()

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      ...meta,
      title: meta.title || docTitle || `${meta.keyword || ''}舆情分析报告`
    },
    sections
  }
}

/**
 * 校验 IR 结构是否合法。
 * @param {Object} ir
 * @returns {{ok:boolean, errors:string[]}}
 */
export function validateIR(ir) {
  const errors = []
  if (!ir || typeof ir !== 'object') {
    return { ok: false, errors: ['IR 为空或非对象'] }
  }
  if (!Array.isArray(ir.sections) || ir.sections.length === 0) {
    errors.push('sections 为空')
  } else {
    ir.sections.forEach((sec, i) => {
      if (!sec || typeof sec !== 'object') {
        errors.push(`第 ${i + 1} 节非对象`)
        return
      }
      if (!sec.title) errors.push(`第 ${i + 1} 节缺少 title`)
      if (!Array.isArray(sec.blocks)) {
        errors.push(`第 ${i + 1} 节 blocks 非数组`)
        return
      }
      sec.blocks.forEach((b, j) => {
        if (!b || !BLOCK_TYPES.includes(b.type)) {
          errors.push(`第 ${i + 1} 节第 ${j + 1} 块类型非法：${b?.type}`)
        }
        if (b?.type === 'list' && !Array.isArray(b.items)) {
          errors.push(`第 ${i + 1} 节第 ${j + 1} 块 list 缺少 items`)
        }
      })
    })
  }
  return { ok: errors.length === 0, errors }
}

/** HTML 转义 */
export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 行内：加粗 **x** → <strong>，引用 [n] → 上标 */
export function inlineHtml(s = '') {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(\d+)\]/g, '<sup class="cite">[$1]</sup>')
}

/**
 * 将 IR 渲染为正文 HTML 片段（章节 + 块），供交互式/打印视图复用。
 * @param {Object} ir
 * @returns {string}
 */
export function irToContentHtml(ir) {
  if (!ir || !Array.isArray(ir.sections)) return ''
  return ir.sections
    .map((sec) => {
      const blocks = (sec.blocks || [])
        .map((b) => {
          if (b.type === 'paragraph') return `<p>${inlineHtml(b.text)}</p>`
          if (b.type === 'quote') return `<blockquote>${inlineHtml(b.text)}</blockquote>`
          if (b.type === 'list') {
            const tag = b.ordered ? 'ol' : 'ul'
            const items = (b.items || []).map((it) => `<li>${inlineHtml(it)}</li>`).join('')
            return `<${tag}>${items}</${tag}>`
          }
          return ''
        })
        .join('\n')
      return `<section class="ir-section" id="${escapeHtml(sec.id || '')}">
  <h2>${inlineHtml(sec.title)}</h2>
  ${blocks}
</section>`
    })
    .join('\n')
}

/** 生成章节目录（TOC）HTML */
export function irToTocHtml(ir) {
  if (!ir || !Array.isArray(ir.sections) || !ir.sections.length) return ''
  const items = ir.sections
    .map((sec, i) => `<li><a href="#${escapeHtml(sec.id || '')}">${i + 1}. ${inlineHtml(sec.title)}</a></li>`)
    .join('')
  return `<nav class="ir-toc"><div class="toc-title">目录</div><ol>${items}</ol></nav>`
}
