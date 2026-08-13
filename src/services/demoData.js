/**
 * demoData.js —— 离线演示数据与模拟返回
 * ---------------------------------------------------
 * 为「离线演示模式」提供全套本地预置数据与模拟 LLM 返回。
 * 各服务层在离线模式下调用此处函数，替代真实网络请求，使整条
 * 「采集 → 清洗 → 分析 → 洞察 → 论坛 → 报告」流水线在无网络环境下
 * 也能完整跑通，中间产物、图表、报告与导出均保持真实结构。
 *
 * 关键设计：LLM 调用统一经 llmService，各 Agent 以不同 system prompt
 * 区分角色。这里据 system prompt 路由到对应的模拟返回，其 JSON / Markdown
 * 结构与真实模型输出一致，因此上层 Agent 无需任何改动即可解析。
 */

// 记录最近一次演示所用关键词（清洗/分析阶段的 prompt 不含关键词时兜底）
let lastKeyword = '示例舆情事件'

/** 模拟网络时延，让演示保留「思考」的节奏感（毫秒） */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 从 prompt 文本中尽力提取关键词，失败则回落到最近一次关键词 */
function extractKeyword(text = '') {
  const m =
    text.match(/舆情关键词：\s*(.+)/) ||
    text.match(/【关键词】\s*(.+)/) ||
    text.match(/关键词：\s*(.+)/)
  if (m && m[1]) {
    const kw = m[1].split(/[\n\r，,。]/)[0].trim()
    if (kw) return kw
  }
  return lastKeyword
}

/* ============================ 演示模型列表 ============================ */

export const DEMO_MODELS = [
  { id: 'demo-kimi', label: 'Kimi K2.6', model: 'moonshot-v1-128k' },
  { id: 'demo-deepseek', label: 'DeepSeek', model: 'deepseek-chat' },
  { id: 'demo-glm', label: '智谱 GLM-4.7', model: 'glm-4.7' },
  { id: 'demo-qwen', label: '通义千问 qwen3.7-plus', model: 'qwen3.7-plus' },
  { id: 'demo-minimax', label: 'MiniMax M2.5', model: 'minimax-m2.5' }
]

/**
 * 特色真实案例关键词（离线热搜第一条）。
 * 命中该案例时，采集 / 分析 / 洞察 / 论坛 / 报告全部回放「真实产物」，
 * 相比通用合成演示更贴近真实效果。
 */
export const FEATURED_KEYWORD = '青岛大学辟谣“新校徽像旭日旗”'

/* ============================ 演示热搜榜 ============================ */

export const DEMO_HOTLIST = [
  { title: FEATURED_KEYWORD, digest: '官方辟谣：网传校徽图样并非青岛大学校徽，纯属AI恶意拼接造谣', hotnum: 58620000 },
  { title: '新能源汽车冬季续航实测', digest: '多地媒体实测低温续航衰减引发热议', hotnum: 48210000 },
  { title: '国产大模型开源新进展', digest: '开发者社区讨论热度持续攀升', hotnum: 37650000 },
  { title: '城市地铁全线网络覆盖', digest: '通勤族点赞信号改善', hotnum: 29880000 },
  { title: '暑期档电影票房破纪录', digest: '观众口碑两极分化', hotnum: 26140000 },
  { title: '某快消品牌客服争议', digest: '退换货流程被质疑繁琐', hotnum: 21030000 },
  { title: '暴雨天气城市应急响应', digest: '排水与预警机制受关注', hotnum: 18760000 },
  { title: '直播电商售后新规落地', digest: '消费者维权更有据可依', hotnum: 15420000 },
  { title: '高校毕业生就业新趋势', digest: '灵活就业比例上升', hotnum: 12980000 },
  { title: '智能家居数据隐私讨论', digest: '用户担忧信息安全', hotnum: 10350000 },
  { title: '本地文旅消费券发放', digest: '带动周末客流增长', hotnum: 8640000 }
]

/* ============================ 真实案例（离线首选，最贴近真实产物）============================ */

/** 判断给定文本/关键词是否属于特色真实案例（青岛大学校徽谣言）。 */
function isFeatured(text = '') {
  return /青岛大学|旭日旗|新校徽/.test(String(text))
}

// —— 真实采集：30 条舆情文本 ——
const QD_TEXTS = [
  '“青岛大学新校徽像旭日旗”系造谣。8月10日，有网民发布视频称“青岛大学新校徽被指像旭日旗，校方紧急撤下”，引发关注。经查，该信息纯属造谣，网传校徽图样并非青岛大学校徽。',
  '真正的青岛大学校徽为2013年5月启用，以蓝色为主基调，由中英文校名和建校年份等三个基本元素组成，交替出现的四部分色块寓意学校主体由四所学校合并而成。',
  '青岛大学表示，该校自1909年建校起均未使用过网传视频中的校徽，近期也没有组织过新校徽设计、征集、发布等工作，网传所谓新校徽图片纯属造谣。',
  '“青岛网络辟谣”微信公众号8月11日发文，经查网传“青岛大学新校徽像旭日旗”纯属造谣，图样并非青岛大学校徽。',
  '网传“青岛大学新校徽被指像旭日旗，校方紧急撤下”，官方辟谣：网传信息不实，网传校徽图样并非青岛大学校徽。',
  '青岛互联网联合辟谣平台提醒：网络空间不是法外之地，互联网信息发布应遵守法律法规，做到不造谣、不信谣、不传谣。',
  '封面新闻：据“青岛网络辟谣”消息，8月10日有网民发布视频引发关注，经查纯属造谣，真正校徽自2013年启用至今。',
  '央广网：“新校徽被指像旭日旗”？青岛大学紧急辟谣，网传新校徽图片并非学校发布。',
  '腾讯新闻：青岛大学辟谣，现校徽由中英文校名和建校年份三个基本元素组成，四部分色块寓意四校合并。',
  '南方网破谣局：“青岛大学新校徽像旭日旗”系谣言，网传校徽图样并非青岛大学校徽。',
  '今日头条：校方紧急辟谣，纯属造谣，网传校徽图样并非青岛大学校徽。',
  '凤凰网：山东一高校辟谣“新校徽像旭日旗”，网传信息不实。',
  '观察者网：“新校徽被指像旭日旗”？青岛大学紧急辟谣。',
  '中华网：青岛大学辟谣新校徽像旭日旗传闻，网传图片纯属造谣。',
  '不少网民评论直指造谣者“极其无耻”，呼吁依法严惩编造并传播谣言的行为。',
  '有评论认为，造谣者利用“旭日旗”这一敏感符号蹭热度、制造对立，性质恶劣。',
  '部分网友讨论：这类AI拼接伪造官方素材的手段成本很低，需要警惕成为常态。',
  '有观点指出，平台算法对情绪化、争议性内容的推荐，客观上放大了谣言的初始传播。',
  '媒体评论：24小时闪电辟谣的背后，是官方媒体与辟谣平台的快速跨平台联动。',
  '有网民表示，官方回应及时、事实清晰，这波辟谣干净利落，值得肯定。',
  '也有网民担心，敏感符号被恶意嫁接到高校，可能对学校形象造成一定负面影响。',
  '讨论中有人呼吁，应加快AI生成内容的强制标识与溯源立法，明确法律责任边界。',
  '有教育界人士建议，高校应建立常态化舆情响应与视觉防伪核验渠道。',
  '网友：现在AI造谣太容易了，普通人很难第一时间辨别真假，需要加强科普。',
  '评论区不少人提醒：不造谣、不信谣、不传谣，遇到可疑信息先看官方来源。',
  '有法律博主分析，恶意编造并传播谣言可能涉嫌违法，建议受害方保留证据依法维权。',
  '部分讨论聚焦：辟谣重在“事实澄清”，但公众更关心造谣者是否会被追责。',
  '有自媒体复盘：青岛大学“校徽门”是一次典型的AI伪造+敏感符号+算法放大的谣言样本。',
  '网民热议：真正的青大校徽以蓝色为主基调，和网传所谓“旭日旗”图样毫无关系。',
  '总体看，舆论主流是对造谣行为的谴责与对官方辟谣的支持，情绪逐步回归理性。'
]

// —— 真实采集：30 条来源 ——
const QD_SOURCES = [
  { title: '“青岛大学新校徽像旭日旗”系造谣 - 杭州辟谣网_杭州网', url: 'https://py.hangzhou.com.cn/content/2026-08/11/content_9277420.htm', displayUrl: 'https://py.hangzhou.com.cn/content/2026-08/11/content_9277420.htm' },
  { title: '“新校徽被指像旭日旗”?青岛大学紧急辟谣 - 封面新闻', url: 'https://www.thecover.cn/news/bVZBY4asG1SH90qSdq8Jkw==', displayUrl: 'https://www.thecover.cn/news/bVZBY4asG1SH90qSdq8Jkw==' },
  { title: '青岛大学辟谣_腾讯新闻', url: 'https://news.qq.com/rain/a/20260811A07P5B00', displayUrl: 'https://news.qq.com/rain/a/20260811A07P5B00' },
  { title: '网传“青岛大学新校徽被指像旭日旗,校方紧急撤下”,官方辟谣:网传校徽图样并非青岛大学校徽', url: 'https://c.m.163.com/news/v/VA322PB0M.html', displayUrl: 'https://c.m.163.com/news/v/VA322PB0M.html' },
  { title: '“青岛大学新校徽像旭日旗”系谣言|破谣局_南方网', url: 'https://news.southcn.com/node_2450fe5179/8037061d97.shtml', displayUrl: 'https://news.southcn.com/node_2450fe5179/8037061d97.shtml' },
  { title: '校方紧急辟谣:纯属造谣,网传校徽图样并非青岛大学校徽 - 今日头条', url: 'https://www.toutiao.com/article/7672688369113006638/', displayUrl: 'https://www.toutiao.com/article/7672688369113006638/' },
  { title: '“新校徽像旭日旗紧急撤下”,青岛大学:纯属造谣!_大众新闻', url: 'https://dzrb.dzng.com/videos/0/NEWS3600949DRZDIPXBUWBAK', displayUrl: 'https://dzrb.dzng.com/videos/0/NEWS3600949DRZDIPXBUWBAK' },
  { title: '“新校徽被指像旭日旗”?青岛大学紧急辟谣!_福州新闻网', url: 'https://news.fznews.com.cn/gngj/20260811/Zn5j17Dt62.shtml', displayUrl: 'https://news.fznews.com.cn/gngj/20260811/Zn5j17Dt62.shtml' },
  { title: '“新校徽被指像旭日旗”?青岛大学紧急辟谣_凤凰网', url: 'https://news.ifeng.com/c/8vVHSJGiEaK', displayUrl: 'https://news.ifeng.com/c/8vVHSJGiEaK' },
  { title: '网民发视频称“青岛大学新校徽被指像旭日旗”,青岛大学辟谣! - 今日头条', url: 'https://www.toutiao.com/article/7672704750505017871/', displayUrl: 'https://www.toutiao.com/article/7672704750505017871/' },
  { title: '“青岛大学新校徽像旭日旗”系造谣 - 青岛辟谣', url: 'https://piyao.qdxin.cn/fensuiji/2026/9064.html', displayUrl: 'https://piyao.qdxin.cn/fensuiji/2026/9064.html' },
  { title: '官方辟谣:网传校徽图样并非青岛大学校徽_手机网易网', url: 'https://m.163.com/dy/article/L3VPHP1G0514R9OJ.html', displayUrl: 'https://m.163.com/dy/article/L3VPHP1G0514R9OJ.html' },
  { title: '“新校徽被指像旭日旗”?青岛大学紧急辟谣!', url: 'https://gzstv.com/a/eefd2c55734a4aa3826a40d4ec563547', displayUrl: 'https://gzstv.com/a/eefd2c55734a4aa3826a40d4ec563547' },
  { title: '青岛大学辟谣新校徽像旭日旗传闻 网传图片纯属造谣_中华网', url: 'https://ent.china.com/movie/newszh/11005281/20260811/49668418.html', displayUrl: 'https://ent.china.com/movie/newszh/11005281/20260811/49668418.html' },
  { title: '网传青岛大学新校徽像旭日旗系谣言 官方辟谣澄清真相_中华网', url: 'https://news.china.com/socialgd/10000169/20260810/49665723.html', displayUrl: 'https://news.china.com/socialgd/10000169/20260810/49665723.html' },
  { title: '“新校徽被指像旭日旗，校方紧急撤下”？青岛大学辟谣_新浪财经', url: 'https://cj.sina.cn/article/norm_detail', displayUrl: 'cj.sina.cn' },
  { title: '青岛大学辟谣新校徽像旭日旗传闻 网传图片纯属造谣', url: 'http://ent.china.com/movie/newszh/11005281/20260811/49668418.html', displayUrl: 'ent.china.com' },
  { title: '网传青岛大学新校徽像旭日旗系谣言 官方辟谣澄清真相', url: 'https://news.china.com/socialgd/10000169/20260810/49665723.html', displayUrl: 'news.china.com' },
  { title: '“青岛大学新校徽像旭日旗”系造谣', url: 'https://www.yzwb.net/news/txs/202608/t20260810_381322.html', displayUrl: 'www.yzwb.net' },
  { title: '“新校徽被指像旭日旗”？青岛大学紧急辟谣_观察者网', url: 'https://www.guancha.cn/politics/2026_08_11_826910.shtml', displayUrl: 'www.guancha.cn' },
  { title: '青岛大学新校徽谣言令人匪夷所思，造谣者到底图什么？', url: 'http://m.toutiao.com/group/7673292456984707584/', displayUrl: 'm.toutiao.com' },
  { title: '青岛大学新校徽像旭日旗？官方辟谣 网传图片非学校发布', url: 'https://3g.china.com/act/redian/13004758/20260811/49668567.html', displayUrl: '3g.china.com' },
  { title: '网传青大换新校徽形似旭日旗？官方辟谣 不实信息被澄清', url: 'https://news.china.com/socialgd/10000169/20260811/49668186.html', displayUrl: 'news.china.com' },
  { title: '新校徽像旭日旗？山东一高校辟谣', url: 'https://sd.ifeng.com/c/8vTiDkLGks9', displayUrl: 'sd.ifeng.com' },
  { title: '“青岛大学新校徽像旭日旗”系谣言｜破谣局', url: 'https://news.southcn.com/node_2450fe5179/8037061d97.shtml', displayUrl: 'news.southcn.com' },
  { title: '青岛大学辟谣新校徽像旭日旗 网传图片纯属造谣', url: 'https://3g.china.com/act/redian/13004758/20260811/49668275.html', displayUrl: '3g.china.com' },
  { title: '青岛大学“新校徽”谣言是如何拼凑出来的', url: 'https://www.sxgov.cn/content/2026-08/12/content_13670812.htm', displayUrl: 'www.sxgov.cn' },
  { title: '集美融媒的微博', url: 'https://m.weibo.cn/detail/5331367933250093', displayUrl: 'm.weibo.cn' },
  { title: '编造“青岛大学旭日旗新校徽”谣言者极其无耻！应受法律严惩 | 锋面评论', url: 'https://www.jfdaily.com.cn/wx/detail.do?id=1158654', displayUrl: 'www.jfdaily.com.cn' },
  { title: '陈老师说舆情27｜青岛大学“校徽门”24小时闪电辟谣背后：当AI造谣成为常态', url: 'https://www.163.com/dy/article/L449DP450536A3D8.html', displayUrl: 'www.163.com' },
  { title: '青岛大学发布辟谣声明 网传新校徽图样并非学校发布', url: 'https://news.qq.com/rain/a/20260811A08K2C00', displayUrl: 'news.qq.com' }
]

// —— 真实分析：情感占比（分析阶段初值，论坛后渐进校准）——
const QD_SENTIMENT = { positive: 5, negative: 30, neutral: 65 }

// —— 真实分析：关键词热度（15）——
const QD_KEYWORDS = [
  { word: '青岛大学', weight: 100 },
  { word: '校徽', weight: 98 },
  { word: '旭日旗', weight: 95 },
  { word: '新校徽', weight: 95 },
  { word: '辟谣', weight: 90 },
  { word: '造谣', weight: 88 },
  { word: '谣言', weight: 82 },
  { word: '青岛网络辟谣', weight: 70 },
  { word: '紧急撤下', weight: 70 },
  { word: '网传', weight: 70 },
  { word: '官方', weight: 70 },
  { word: '网民', weight: 65 },
  { word: '视频', weight: 65 },
  { word: '2013年', weight: 60 },
  { word: '撤下', weight: 60 }
]

// —— 真实分析：各模型独立观点（并行集成后取并集，还原 5 模型协作的观点丰富度）——
const QD_OPINIONS_BY_MODEL = {
  'demo-kimi': [
    '网传“青岛大学新校徽像旭日旗”经官方核实为谣言，所谓新校徽图样并非学校发布，校方近期亦无新校徽设计、征集或发布计划。',
    '青岛大学现用校徽自2013年5月启用至今，以蓝色为主基调，由中英文校名、建校年份及四部分色块组成，寓意四校合并，与网传图片完全无关。',
    '该谣言通过短视频平台迅速传播并引发舆论关注，官方媒体及辟谣平台快速联动，在24小时内完成核查与澄清，有效遏制了谣言扩散。',
    '舆论场出现对造谣者的强烈谴责，部分评论直指其“极其无耻”并呼吁依法严惩，同时引发对AI技术被滥用于恶意拼接、炮制高校谣言的深层反思。'
  ],
  'demo-deepseek': [
    '网传青岛大学新校徽像旭日旗的信息纯属造谣，校方已紧急辟谣。',
    '青岛大学现校徽自2013年启用，从未使用过网传图样，近期无新校徽设计发布。',
    '造谣者利用敏感符号制造话题，引发公众误解，应依法严惩。',
    '官方辟谣及时，提醒网民不造谣、不信谣、不传谣。'
  ],
  'demo-glm': [
    '事件反映出AI造谣可能成为常态，高校需加强舆情应对能力。',
    '网传“青岛大学新校徽像旭日旗”系造谣，官方已紧急辟谣澄清。',
    '青岛大学明确表示近期未设计新校徽，现用校徽为2013年启用版本。',
    '舆论强烈谴责编造谣言者，呼吁加强网络监管及法律惩处。'
  ],
  'demo-qwen': [
    '事件引发对高校应对网络谣言及AI造谣风险的思考与讨论。',
    '网传青岛大学新校徽形似旭日旗的信息纯属造谣，网传校徽图样并非青岛大学校徽。',
    '青岛大学现校徽于2013年5月启用，以蓝色为主基调，由中英文校名和建校年份等三个基本元素组成。'
  ],
  'demo-minimax': [
    '青岛大学自1909年建校起从未使用过网传视频中的校徽，近期也未组织过新校徽设计、征集或发布工作。',
    '青岛互联网联合辟谣平台及多家官方媒体迅速发声澄清事实，呼吁网民不信谣不传谣。',
    '造谣者行为受到舆论谴责，有观点认为应依法严惩网络造谣行为。'
  ]
}

// —— 真实洞察 ——
const QD_INSIGHT = {
  trend:
    '该舆情呈现典型的“脉冲式爆发、快速回落”态势。谣言依托短视频平台的视觉冲击力与算法推荐在短时间内触达大量用户，但得益于官方在24小时内完成跨平台联动辟谣，且校徽存在明确的2013年启用历史事实与可验证的官方图样，舆情迅速从“质疑校徽设计”转向“谴责造谣行为”与“警惕AI滥用”，整体可控并趋于平息，但关于技术伦理与平台责任的讨论仍在持续。',
  risks: [
    'AI伪造官方视觉素材成本极低，已形成“敏感符号+权威机构”的造谣模板，存在向其他高校或公共机构复制蔓延的风险',
    '涉及旭日旗等历史敏感符号极易触发民族情绪，即便辟谣成功，仍可能在部分群体中留下对高校品牌的负面印象残留',
    '短视频平台算法对情绪化、争议性内容的推荐机制，可能在下一次类似事件中继续放大谣言的初始传播声量',
    '官方辟谣侧重于“事实澄清”，但公众情绪已聚焦于“追责”与“技术监管”，若后续无司法追责跟进，可能引发对辟谣公信力的二次质疑',
    '生成式AI缺乏有效的内容溯源与标识机制，导致公众对网络视觉信息的整体信任成本持续上升'
  ],
  demands: [
    '司法机关介入调查，对恶意炮制并传播谣言的责任主体依法予以严惩，形成实质性震慑',
    '短视频及社交平台建立针对高校、政府等权威机构官方视觉标识的敏感保护机制，提升AI生成虚假官方内容的识别与拦截能力',
    '高校建立常态化的舆情响应与视觉防伪验证渠道，确保公众能够在第一时间核验官方信息真伪',
    '加快AI生成内容的强制性标识与溯源立法，明确技术滥用与恶意拼接的法律责任边界',
    '平台优化算法推荐逻辑，对涉及历史敏感符号与公共机构的话题启动更高等级的人工复核',
    '加强公众媒介素养教育，提升对AI伪造官方物料的辨别能力，压缩谣言传播的社会心理基础'
  ],
  cause:
    '舆情爆发的核心原因在于造谣者精准选择了“旭日旗”这一触碰民族情感底线的极端敏感符号，与具有公共权威属性的高校校徽进行恶意嫁接，通过短视频平台实现了“视觉冲击+情绪刺激”的高效传播，迅速触发公众的防御性愤怒与自发转发。而舆情得以快速平息并转向理性，则是因为青岛大学现用校徽自2013年启用以来有明确、公开且持续使用的事实依据，官方辟谣具备不可辩驳的物证基础；同时，青岛互联网联合辟谣平台与官方媒体在黄金24小时内完成跨部门联动响应，及时切断了谣言的进一步发酵链。舆论焦点后续从“校徽本身”转向“AI技术滥用”与“造谣者严惩”，深层反映了公众对生成式AI降低作恶门槛、平台审核滞后以及历史符号被工具化消费的集体焦虑。'
}

// —— 真实论坛：各验证 Agent 分轮发言（按 模型 id + 轮次）——
const QD_FORUM_SPEECH = {
  1: {
    'demo-deepseek':
      '情感占比中负面30%略高，多数讨论聚焦辟谣事实，情绪以中性为主。风险分析全面，但补充一点：需关注谣言对青岛大学招生及国际形象的潜在影响。诉求中“司法追责”与“平台责任”是核心，未被夸大。',
    'demo-glm':
      '情感占比中负面情绪略显保守，舆论对造谣者的愤怒（“无耻”“严惩”）声量较高，建议上调负面占比。风险与诉求分析全面，对AI滥用及平台责任的洞察精准，整体结论可信度高。',
    'demo-qwen':
      '当前情感占比基本合理，但负面占比略被低估。辟谣虽及时，但“旭日旗”敏感符号引发的民族情绪具有长尾效应，部分网民对高校品牌信任度受损未被充分量化。此外，对平台审核滞后、AI标识缺失的制度性不满易被忽视，需警惕“事实澄清”无法完全消解情绪余波。',
    'demo-minimax':
      '该舆情分析整体逻辑清晰，情感占比（正面5%、负面30%、中性65%）基本合理。负面情绪主要源于对造谣者的谴责，符合舆论实际；中性占比较高反映了对辟谣过程和AI技术滥用的理性讨论。风险与诉求覆盖较全面，AI造谣风险、敏感符号触发民族情绪、平台算法放大效应等关键点均已纳入。'
  },
  2: {
    'demo-deepseek':
      '现有情感分析未区分对造谣者的谴责与对校徽的质疑，负面情绪多指向造谣行为，而非校方。品牌受损缺乏实证数据，需结合搜索指数、招生咨询等量化评估。防控路径中，平台算法优化与司法追责边际效用最高。',
    'demo-glm':
      '负面情绪主要指向造谣者而非校方，当前占比需区分语义。缺乏搜索指数或招生数据支撑“品牌受损”结论，夸大风险。应对路径中，平台算法拦截的边际效用高于事后追责。',
    'demo-qwen':
      '情感占比基本合理，但负面强度被低估。当前分析未清晰切分“对造谣者的谴责”与“对校徽/高校的质疑”，前者属正向情绪（维护正义），后者才是真正负面。建议将负面情绪中至少60%重新归类为对造谣者的愤怒（实为正向），真实对高校的负面应低于10%。品牌受损缺乏搜索指数、招生咨询量等实证支撑，属推测性风险。AI伪造识别与司法追责边际效用最高，平台算法优化次之。',
    'demo-minimax':
      '当前负面32%的情感占比存在语义模糊问题。未对“对造谣者的谴责”与“对校徽本身的质疑”进行切分——前者本质是支持校方的正向行动，后者才是真正的负面舆情。按实际语义重新评估，负面情绪中约15%指向造谣者（应归入支持性正面），真正对校徽的质疑仅约17%。因此调整后：正面约20%（含对辟谣的支持+对造谣者的谴责），负面约17%（对校徽的疑虑+对AI滥用的担忧），中性约63%。'
  }
}

// 各验证 Agent 各轮一致度（均值 → 第 1 轮 86%、第 2 轮 72%）
const QD_FORUM_AGREEMENT = {
  1: { 'demo-deepseek': 84, 'demo-glm': 88, 'demo-qwen': 85, 'demo-minimax': 87 },
  2: { 'demo-deepseek': 72, 'demo-glm': 74, 'demo-qwen': 70, 'demo-minimax': 72 }
}

// 各验证 Agent 各轮分歧点
const QD_FORUM_DISPUTES = {
  1: {
    'demo-glm': ['负面占比被低估，对造谣者的愤怒声量较高'],
    'demo-qwen': ['敏感符号引发的民族情绪长尾效应未被充分量化']
  },
  2: {
    'demo-qwen': ['“对造谣者的愤怒”应从负面剥离并计入正向支持'],
    'demo-minimax': ['情感占比应按语义重切分为 正面约20%/负面约17%/中性63%']
  }
}

// 各验证 Agent 各轮补充要点
const QD_FORUM_SUPPLEMENT = {
  1: {
    'demo-deepseek': ['关注谣言对青岛大学招生及国际形象的潜在影响'],
    'demo-qwen': ['补充平台审核滞后与AI标识缺失的制度性不满']
  },
  2: {
    'demo-deepseek': ['以搜索指数、招生咨询量等实证数据验证品牌受损']
  }
}

// —— 真实论坛：主持人各轮归纳 ——
const QD_HOST = {
  1: {
    summary:
      '本轮围绕青岛大学“新校徽像旭日旗”谣言的舆情分析展开验证。核心事实已确认：网传图样系伪造，校方自2013年起沿用现校徽且无更新计划，官方于24小时内完成跨平台辟谣。各Agent均认可AI伪造、敏感符号嫁接与平台算法放大是核心风险，司法追责与平台责任是主要诉求。当前焦点集中于情感占比的判定分歧——负面情绪究竟是“对造谣者的谴责”还是“对校徽本身的质疑”，以及谣言是否已对高校品牌造成可量化的长尾损害。',
    consensus: [
      '网传“青岛大学新校徽像旭日旗”纯属谣言，官方已及时辟谣，现用校徽2013年启用的事实清晰',
      'AI技术被滥用于伪造官方视觉素材、平台算法放大敏感符号传播，是本轮舆情的核心风险点',
      '舆论主流诉求聚焦于对造谣者的司法追责与强化平台审核/AI标识机制'
    ],
    divergences: [
      '情感占比判定存在直接分歧：DeepSeek认为负面略高、应以中性为主；智谱GLM-4.7与通义千问认为负面占比被低估、建议上调；MiniMax认为基本合理',
      '品牌损害与情绪长尾效应的评估分歧：通义千问与DeepSeek指出敏感符号可能留下品牌信任度受损及国际形象影响的长期余波；MiniMax与智谱更侧重辟谣有效、舆情已回归理性',
      '风险优先级侧重不同：DeepSeek补充招生及国际形象风险，通义千问强调平台审核滞后与AI标识缺失，智谱与MiniMax认为现有框架已较全面'
    ],
    questions: [
      '现有情感分析是否已对“对造谣者的谴责”与“对校徽本身的质疑”进行语义切分？不同指向对高校舆情定级的影响权重应如何分配？',
      '除情绪余波描述外，是否有搜索指数、国际舆情或招生咨询等实证数据可验证“青岛大学品牌受损”的长尾效应？',
      '在AI伪造识别、平台算法优化、司法追责与高校视觉防伪等多重应对路径中，何者对本类谣言的边际防控效用最高？'
    ],
    focus: '下一轮聚焦情感语义切分与品牌损害的实证验证'
  },
  2: {
    summary:
      '本轮讨论聚焦首轮情感分析的方法论缺陷。各Agent一致认为当前负面情绪未区分“对造谣者的愤怒/谴责”与“对校徽/校方的质疑”，且“品牌受损”风险缺乏搜索指数、招生咨询量等实证数据支撑，属推测性结论。但在情绪重新校准的具体比例、防控路径的边际效用排序及负面强度整体判断上存在分歧。通义千问提出负面强度被低估，MiniMax给出明确的情感重分配方案（正面约20%、负面约17%、中性63%），DeepSeek与智谱则在平台算法拦截、AI识别与司法追责的优先级上各执己见。',
    consensus: [
      '当前情感分析存在关键语义缺陷，未将“对造谣者的愤怒/谴责”与“对校徽或校方的质疑”进行切分',
      '“品牌受损”风险缺乏搜索指数、招生咨询量等实证数据支撑，当前结论具有推测性',
      '舆论场中的负面情绪主体指向造谣行为而非青岛大学校方，校方因及时辟谣获得公众支持'
    ],
    divergences: [
      '情感重校准的量化结果不一致：MiniMax提出正面约20%、负面约17%、中性63%；通义千问认为对高校的真实负面应低于10%，二者对正面占比的估算差距显著',
      '防控路径的边际效用排序存在分歧：DeepSeek认为平台算法优化与司法追责最高；智谱认为平台算法拦截高于事后追责；通义千问将AI伪造识别与司法追责列为最高',
      '负面强度整体判断存在角度差异：通义千问提出当前负面强度被低估，与其他Agent侧重“情绪指向转移”的分析角度不同'
    ],
    questions: [
      '针对“对造谣者的愤怒”这类支持性情绪，应建立何种标准化的情感极性切分规则？是否应在高校辟谣类舆情中将其从负面剥离并计入正向支持？',
      '在缺乏搜索指数、招生咨询数据等实证前，“品牌受损”风险是否应暂时降级为假设性风险？需要哪些可获取的替代指标进行初步验证？',
      '平台事前算法拦截、AI伪造识别技术与司法事后追责的防控效果，应引入响应时效、治理成本、覆盖范围等哪些维度进行可量化的边际效用评估？'
    ],
    focus: '收敛结论并建立情感切分规则与实证验证指标'
  }
}

// —— 真实报告：思考过程 + 各章节 Markdown ——
const QD_REPORT = {
  reasoning: [
    '正在整合采集、清洗、分析、洞察与两轮论坛协作的结论……\n',
    '核心事实：网传“青岛大学新校徽像旭日旗”系AI恶意拼接造谣，现用校徽2013年启用，官方24小时内跨平台辟谣。\n',
    '注意到论坛分歧：负面情绪的语义指向（谴责造谣者 vs 质疑校徽）需在报告中厘清，避免舆情定级高估。\n',
    '按《通用舆情分析报告》章节大纲组织正文，并在引用事实处标注来源编号。\n'
  ],
  sections: [
    {
      title: '舆情概况',
      body:
        '近日，网传“青岛大学新校徽像旭日旗”引发舆论风波。经“青岛网络辟谣”平台及校方核实，该信息纯属谣言：网传校徽图样并非学校发布，校方近期亦无新校徽设计、征集或发布计划 [1][2][4]。青岛大学现用校徽自2013年5月启用至今，以蓝色为主基调，由中英文校名、建校年份等元素组成，寓意四校合并，与网传图片完全无关 [7][12]。该谣言依托短视频平台的视觉冲击力与算法推荐迅速扩散，青岛互联网联合辟谣平台与多家官方媒体在24小时内完成跨平台核查与澄清，有效遏制了谣言扩散 [2][7][10]。目前舆情整体呈“脉冲式爆发、快速回落”态势，讨论焦点已从“校徽设计质疑”转向“谴责造谣行为”与“警惕AI滥用”，但关于技术伦理与平台责任的深层反思仍在持续 [30]。'
    },
    {
      title: '情感分析',
      body:
        '基于30条有效样本的多Agent校准，情感分布为：正面8%、负面29%、中性63%。然而，经DeepSeek、智谱GLM-4.7、通义千问、MiniMax等Agent交叉验证，当前负面情绪存在显著的语义指向模糊问题。舆论中的强烈愤怒（如评论直指造谣者“极其无耻”并呼吁依法严惩 [29]）实质是针对恶意拼接行为，而非青岛大学校方。若将此类“支持性愤怒”从负面情绪中剥离，真实针对校徽或校方的负面占比将显著降低，部分Agent评估真实对高校负面应低于10%。因此，情绪主导面实质为以中性事实传播与对造谣行为的正义性质询为主流，校方因及时辟谣获得舆论广泛支持。现有情感数据未对“对造谣者的谴责”与“对校徽本身的质疑”进行语义切分，直接用于舆情定级可能存在高估风险。'
    },
    {
      title: '深度洞察',
      body:
        '关键词权重显示，“青岛大学”（100）、“校徽”（98）、“旭日旗”（95）、“辟谣”（90）、“造谣”（88）构成核心议题矩阵。舆情爆发的核心原因在于造谣者精准选择“旭日旗”这一触碰民族情感底线的极端敏感符号，与具有公共权威属性的高校校徽进行恶意嫁接，通过短视频平台实现“视觉冲击+情绪刺激”的高效传播，迅速触发公众的防御性愤怒与自发转发 [29][27]。舆情得以快速平息并转向理性，则是因为青岛大学现用校徽自2013年启用以来有明确、公开且持续使用的事实依据，官方辟谣具备不可辩驳的物证基础 [7][12]，且官方媒体在黄金24小时内完成跨部门联动响应 [2][7]。\n\n舆论核心诉求包括：\n\n- 司法机关介入调查，对恶意炮制并传播谣言的责任主体依法予以严惩，形成实质性震慑 [29][21]\n- 短视频及社交平台建立针对高校、政府等权威机构官方视觉标识的敏感保护机制，提升AI生成虚假官方内容的识别与拦截能力 [30]\n- 高校建立常态化的舆情响应与视觉防伪验证渠道，确保公众能够在第一时间核验官方信息真伪\n- 加快AI生成内容的强制性标识与溯源立法，明确技术滥用与恶意拼接的法律责任边界 [30]\n- 平台优化算法推荐逻辑，对涉及历史敏感符号与公共机构的话题启动更高等级的人工复核\n- 加强公众媒介素养教育，提升对AI伪造官方物料的辨别能力，压缩谣言传播的社会心理基础 [30]'
    },
    {
      title: '趋势与风险',
      body:
        '研判显示，该舆情虽因事实清晰、辟谣及时而整体可控，但若后续缺乏司法追责与制度性跟进，存在情绪余波与二次发酵风险。风险等级评定为“中”（45分）。\n\n主要风险点：\n\n- **模板化复制风险**：AI伪造官方视觉素材成本极低，已形成“敏感符号+权威机构”的造谣模板，存在向其他高校或公共机构复制蔓延的风险 [27][30]\n- **品牌印象残留风险**：涉及旭日旗等历史敏感符号极易触发民族情绪，即便辟谣成功，仍可能在部分群体中留下对高校品牌的负面印象残留；但需指出，该风险目前缺乏搜索指数、招生咨询量等实证数据支撑，具有推测性 [29]\n- **平台算法放大风险**：短视频平台算法对情绪化、争议性内容的推荐机制，可能在下一次类似事件中继续放大谣言的初始传播声量 [30]\n- **辟谣公信力透支风险**：官方辟谣侧重于“事实澄清”，但公众情绪已聚焦于“追责”与“技术监管”，若后续无司法追责跟进，可能引发对辟谣公信力的二次质疑 [21]\n- **系统性信任危机风险**：生成式AI缺乏有效的内容溯源与标识机制，导致公众对网络视觉信息的整体信任成本持续上升 [30]'
    },
    {
      title: '应对建议',
      body:
        '**即时处置建议：**\n\n- **司法与监管层面**：公安机关应迅速介入溯源，对谣言炮制者依法查处并及时通报，将“事实澄清”延伸至“追责落地”，回应公众情绪焦点 [29][21]\n- **平台层面**：短视频平台应建立高校、政府官方视觉标识的敏感保护库，对涉及此类机构及历史敏感符号的疑似AI生成内容启动先审后发或强制标识机制 [30]\n- **高校层面**：青岛大学及同类高校应完善官方网站与社交账号的视觉标识防伪验证专区，在招生季等关键节点前置发布官方图样与核验指引，主动压缩谣言空间\n\n**传播优化建议：**\n\n- **议题设置**：后续官方发布应从单一辟谣转向“辟谣+技术防范+法律震慑”的组合叙事，将公众对AI滥用的担忧引导至制度建设层面 [30]\n- **媒介素养**：联合辟谣平台与教育部门推出“AI识谣”专项科普，针对短视频平台的视觉造假特征提升公众辨别能力\n- **监测预警**：建立对“校徽”“校训”等高校核心视觉资产的网络监测哨兵机制，实现类似谣言的早发现、早阻断'
    },
    {
      title: '结论溯源',
      body:
        '本报告基于30条有效样本，综合Kimi K2.6、DeepSeek、智谱GLM-4.7、通义千问qwen3.7-plus、MiniMax M2.5及本地情感词典的独立分析结果，并经2轮多Agent论坛辩论与交叉验证（末轮一致度72%），核心结论可信度较高。\n\n交叉验证形成的核心共识包括：当前情感分析存在关键语义缺陷，未将“对造谣者的愤怒/谴责”与“对校徽或校方的质疑”进行切分，负面情绪主体实际指向造谣行为而非青岛大学校方，校方因及时辟谣获得公众支持；“品牌受损”风险缺乏搜索指数、招生咨询量等实证数据支撑，当前结论具有推测性；AI伪造、敏感符号嫁接与平台算法放大是本轮舆情的核心风险点，司法追责与平台责任是主要诉求。\n\n尚存未决分歧：若对负面情绪进行语义重切分，正面与负面占比的具体校准比例存在差异（如MiniMax建议正面约20%、负面约17%、中性63%；通义千问认为真实对高校负面应低于10%）；此外，平台事前算法拦截、AI伪造识别与司法事后追责的边际效用排序尚需结合响应时效、治理成本等维度进一步量化评估。建议后续补充搜索指数、招生咨询反馈等实证数据以验证品牌长尾影响，并建立辟谣类舆情中“支持性愤怒”情绪的标准化归类规则。'
    }
  ]
}

/** 真实案例·清洗：原样透传（30 条均为有效正文，清洗前后一致）。 */
function qdCleanPassthrough(user) {
  let list = []
  const m = user.match(/\[[\s\S]*\]/)
  if (m) {
    try {
      list = JSON.parse(m[0])
    } catch {
      list = []
    }
  }
  return JSON.stringify({ cleaned: Array.isArray(list) ? list : [] })
}

/** 真实案例·分析：按模型返回其独立观点（集成后取并集还原多模型丰富度）。 */
function qdAnalyze(model) {
  const opinions = QD_OPINIONS_BY_MODEL[model] || QD_OPINIONS_BY_MODEL['demo-kimi']
  return JSON.stringify({
    sentiment: { ...QD_SENTIMENT },
    keywords: QD_KEYWORDS,
    opinions
  })
}

/** 真实案例·论坛：按 模型 + 轮次 返回该验证 Agent 的发言与评估。 */
function qdCritic(model, round) {
  const r = QD_FORUM_SPEECH[round] ? round : 1
  return JSON.stringify({
    content: QD_FORUM_SPEECH[r]?.[model] || '结论方向认同，细节以主持人归纳为准。',
    sentiment: { positive: 8, negative: 29, neutral: 63 },
    agreement: QD_FORUM_AGREEMENT[r]?.[model] ?? 80,
    disputes: QD_FORUM_DISPUTES[r]?.[model] || [],
    supplement: QD_FORUM_SUPPLEMENT[r]?.[model] || []
  })
}

/** 真实案例·报告：流式回放真实报告（思考过程 + 6 章节）。 */
async function qdReportStream({ onToken, onReasoning }) {
  if (onReasoning) {
    for (const t of QD_REPORT.reasoning) {
      onReasoning(t)
      await delay(220)
    }
  }
  let full = ''
  const emit = async (text) => {
    full += text
    const size = 12
    for (let i = 0; i < text.length; i += size) {
      onToken?.(text.slice(i, i + size))
      await delay(20)
    }
  }
  for (const sec of QD_REPORT.sections) {
    await emit(`## ${sec.title}\n\n`)
    await emit(sec.body.trim() + '\n\n')
  }
  return full.trim()
}

/* ============================ 演示采集数据 ============================ */

/**
 * 生成演示采集结果（原始舆情文本 + 来源），文本中嵌入关键词以贴近真实。
 * @param {string} keyword
 * @returns {{texts:string[], sources:Array, aiSummary:string}}
 */
export function demoCollect(keyword) {
  const kw = String(keyword || '').trim() || lastKeyword
  lastKeyword = kw

  // 特色真实案例：回放真实采集产物（30 条文本 + 30 条来源）
  if (isFeatured(kw)) {
    return {
      texts: [...QD_TEXTS],
      sources: [...QD_SOURCES],
      aiSummary:
        '网传“青岛大学新校徽像旭日旗”经官方核实纯属谣言：现用校徽自2013年5月启用、近期无新校徽计划，官方媒体与辟谣平台24小时内跨平台辟谣，舆论焦点转向谴责造谣与警惕AI滥用。'
    }
  }

  const texts = [
    `最近关于${kw}的讨论越来越多，身边不少朋友都在关注。`,
    `体验了一段时间${kw}，整体感觉还不错，性价比挺高的。`,
    `对${kw}有点失望，宣传和实际差距有点大，希望厂商改进。`,
    `${kw}这波操作确实用心，服务态度值得点赞。`,
    `客观说，${kw}有优点也有缺点，不能一概而论。`,
    `${kw}的售后流程太繁琐了，处理速度也慢，体验不佳。`,
    `身边同事都推荐${kw}，说是同类里比较靠谱的选择。`,
    `关于${kw}的负面消息有点多，不知道是不是被带节奏了。`,
    `我觉得${kw}未来潜力很大，值得持续观望。`,
    `${kw}价格偏高，普通消费者接受起来还是有门槛。`,
    `用了才知道，${kw}在细节上还有很多可以打磨的地方。`,
    `${kw}的官方回应挺及时的，态度还算诚恳。`,
    `第一次接触${kw}，客服解答很专业，问题很快解决了。`,
    `对比了几家，最后还是选了${kw}，暂时没踩坑。`,
    `${kw}最近的更新解决了不少老问题，进步看得见。`
  ]

  const sources = [
    { title: `${kw}相关讨论汇总 - 社区热帖`, url: 'https://example.com/demo/1', displayUrl: 'example.com/demo/1' },
    { title: `媒体观察：${kw}的口碑现状`, url: 'https://example.com/demo/2', displayUrl: 'example.com/demo/2' },
    { title: `用户实测：${kw}体验报告`, url: 'https://example.com/demo/3', displayUrl: 'example.com/demo/3' },
    { title: `行业分析：${kw}的机遇与挑战`, url: 'https://example.com/demo/4', displayUrl: 'example.com/demo/4' },
    { title: `${kw}官方回应与后续进展`, url: 'https://example.com/demo/5', displayUrl: 'example.com/demo/5' }
  ]

  return {
    texts,
    sources,
    aiSummary: `围绕「${kw}」的舆情整体呈中性偏正，正面聚焦性价比与服务，负面集中在价格与售后体验。`
  }
}

/* ============================ 模拟 LLM 返回 ============================ */

/** 清洗 Agent 返回：{ cleaned: [...] } —— 从原始列表剔除若干条模拟去噪 */
function fakeClean(user) {
  let list = []
  const m = user.match(/\[[\s\S]*\]/)
  if (m) {
    try {
      list = JSON.parse(m[0])
    } catch {
      list = []
    }
  }
  const cleaned = Array.isArray(list) && list.length
    ? list.filter((_, i) => i % 7 !== 6) // 象征性剔除约 1/7 视为噪声
    : []
  return JSON.stringify({ cleaned })
}

/** 分析 Agent 返回：情感占比 + 关键词 + 观点 */
function fakeAnalyze(keyword) {
  return JSON.stringify({
    sentiment: { positive: 46, negative: 27, neutral: 27 },
    keywords: [
      { word: keyword, weight: 100 },
      { word: '性价比', weight: 82 },
      { word: '售后', weight: 74 },
      { word: '体验', weight: 69 },
      { word: '价格', weight: 66 },
      { word: '服务态度', weight: 58 },
      { word: '质量', weight: 52 },
      { word: '更新', weight: 47 },
      { word: '口碑', weight: 43 },
      { word: '客服', weight: 39 }
    ],
    opinions: [
      `多数用户认可${keyword}的性价比与服务态度，正面评价占主导。`,
      '价格偏高与售后流程繁琐是负面情绪的主要来源。',
      '部分用户对宣传与实际的落差表示失望，呼吁厂商改进。',
      '官方回应较为及时，一定程度缓和了争议。'
    ]
  })
}

/** 洞察 Agent 返回：趋势 + 风险 + 诉求 + 成因 */
function fakeInsight(keyword) {
  return JSON.stringify({
    trend: `${keyword}的舆情整体保持中性偏正，短期内正面声量随产品更新持续释放，但价格与售后议题仍是潜在波动点，需持续监测。`,
    risks: [
      '售后流程体验不佳，易引发个案在社媒放大形成负面话题',
      '价格门槛较高，可能削弱下沉市场的口碑扩散',
      '宣传与实际落差若积累，存在信任透支风险'
    ],
    demands: [
      '简化并加速售后处理流程',
      '提供更透明的价格与权益说明',
      '加强产品细节打磨与更新沟通'
    ],
    cause: `${keyword}的舆情走向主要由真实使用体验驱动：正面来自性价比与服务，负面集中在价格与售后，官方及时回应是情绪未进一步恶化的关键。`
  })
}

/** 验证 Agent（论坛发言 / 单轮交叉验证）返回 */
function fakeCritic(round = 1) {
  const base = {
    content:
      round <= 1
        ? '整体判断合理，正面占比与观点吻合；但售后风险的权重可略上调，建议关注个案传播。'
        : '经上一轮补充后结论更稳健，情感占比趋于收敛，分歧主要在负面话题的放大概率。',
    sentiment: { positive: 44, negative: 29, neutral: 27 },
    agreement: round <= 1 ? 82 : 90,
    disputes: round <= 1 ? ['负面话题的潜在放大概率可能被低估'] : [],
    supplement: round <= 1 ? ['建议补充售后个案的传播路径监测'] : []
  }
  return JSON.stringify(base)
}

/** 论坛主持人返回：归纳共识 / 分歧 / 追问 / 聚焦 */
function fakeHost(keyword, round = 1) {
  return JSON.stringify({
    summary: `第 ${round} 轮讨论中，各验证 Agent 对${keyword}的正面基调达成共识，分歧集中在负面话题的放大概率与售后风险权重。`,
    consensus: [
      '正面情绪占主导，主要来自性价比与服务',
      '价格与售后是负面情绪的核心来源'
    ],
    divergences: round <= 1 ? ['负面话题在社媒的放大概率评估不一致'] : [],
    questions:
      round <= 1
        ? ['售后个案在何种条件下会被放大为公共话题？', '价格敏感人群的口碑权重应如何量化？']
        : ['如何持续监测负面话题的传播拐点？'],
    focus: round <= 1 ? '下一轮聚焦售后风险的传播路径与量化权重' : '收敛结论并明确监测指标'
  })
}

/**
 * 依据 system prompt 路由到对应的模拟 LLM 返回（非流式）。
 * 命中特色真实案例（青岛大学）时回放真实产物，否则用通用合成数据。
 * @param {string} system
 * @param {string} user
 * @param {string} [model] 调用模型 id（用于分析/论坛按模型返回真实差异化产物）
 * @returns {Promise<string>}
 */
export async function demoLLM({ system = '', user = '', model } = {}) {
  await delay(300 + Math.random() * 400)
  const featured = isFeatured(user)
  const keyword = extractKeyword(user)

  if (system.includes('清洗')) {
    return featured ? qdCleanPassthrough(user) : fakeClean(user)
  }
  if (system.includes('舆情分析师')) {
    return featured ? qdAnalyze(model) : fakeAnalyze(keyword)
  }
  if (system.includes('洞察')) {
    return featured ? JSON.stringify(QD_INSIGHT) : fakeInsight(keyword)
  }
  if (system.includes('主持人')) {
    const rm = user.match(/当前轮次：第\s*(\d+)/)
    const round = rm ? Number(rm[1]) : 1
    return featured ? JSON.stringify(QD_HOST[round] || QD_HOST[1]) : fakeHost(keyword, round)
  }
  if (system.includes('验证') || system.includes('质检') || system.includes('辩论')) {
    // 论坛发言可能含「主持人引导」，据此粗略区分轮次
    const round = user.includes('主持人引导') ? 2 : 1
    return featured ? qdCritic(model, round) : fakeCritic(round)
  }
  // 兜底：返回一个通用 JSON，避免上层解析异常
  return JSON.stringify({ note: '离线演示占位返回' })
}

/**
 * 依据报告 system prompt 中的章节大纲，生成一份结构化 Markdown 报告，
 * 并以流式方式（逐段 token）回传，完整复现真实流式报告的观感。
 * @param {Object} params
 * @param {string} params.system   报告 Agent 的 system prompt（含章节大纲）
 * @param {string} params.user     含关键词等上下文
 * @param {(t:string)=>void} [params.onToken]
 * @param {(t:string)=>void} [params.onReasoning]
 * @returns {Promise<string>} 完整 Markdown
 */
export async function demoLLMStream({ system = '', user = '', onToken, onReasoning }) {
  // 特色真实案例：流式回放真实报告
  if (isFeatured(user)) {
    return qdReportStream({ onToken, onReasoning })
  }

  const keyword = extractKeyword(user)

  // 从 system prompt 中解析模板章节标题（形如 "1. ## 章节名——引导语"）
  const sectionTitles = []
  const re = /##\s*(.+?)——/g
  let match
  while ((match = re.exec(system)) !== null) {
    sectionTitles.push(match[1].trim())
  }
  if (sectionTitles.length === 0) {
    sectionTitles.push('舆情概览', '情感分析', '风险与诉求', '趋势研判', '结论与建议')
  }

  // 模拟「思考过程」
  if (onReasoning) {
    const thoughts = [
      '正在整合采集、清洗、分析、洞察与论坛协作的结论……\n',
      `确认关键词「${keyword}」，情感基调为中性偏正，负面集中在价格与售后。\n`,
      '按模板章节大纲组织正文，并在引用事实处标注来源编号。\n'
    ]
    for (const t of thoughts) {
      onReasoning(t)
      await delay(200)
    }
  }

  // 逐章节构造正文
  const bodyBySection = {
    default: (title) =>
      `围绕「${keyword}」，本节结合多智能体分析结果展开说明。整体情感呈中性偏正，正面评价（约 46%）主要集中在性价比与服务态度[1][3]，负面评价（约 27%）则聚焦价格门槛与售后流程体验[2][5]。\n\n- 正面：性价比高、服务态度好、更新迭代积极\n- 负面：价格偏高、售后流程繁琐、宣传与实际存在落差\n- 中性：观望与理性对比为主\n`
  }

  const specialBody = (title) => {
    if (/建议|应对|对策|策略/.test(title)) {
      return `针对「${keyword}」的舆情现状，建议如下：\n\n1. 简化并加速售后处理流程，压缩个案发酵空间[5]；\n2. 提升价格与权益透明度，缓解价格敏感人群顾虑[2]；\n3. 持续打磨产品细节并加强更新沟通，巩固正面口碑[3]；\n4. 建立负面话题传播监测机制，及时预警拐点。\n`
    }
    if (/风险|诉求/.test(title)) {
      return `**主要风险**\n\n- 售后体验不佳的个案易在社媒被放大[5]\n- 价格门槛偏高削弱下沉市场扩散\n- 宣传与实际落差累积存在信任透支风险\n\n**核心诉求**\n\n- 更快更简的售后流程\n- 更透明的价格与权益说明\n- 更扎实的产品细节与沟通\n`
    }
    if (/溯源|结论/.test(title)) {
      return `经 2 轮论坛协作（主持人引导多个验证 Agent 交叉复核），各方对「${keyword}」的正面基调达成共识，情感占比多轮渐进校准后趋于收敛（末轮一致度约 90%），主要分歧在于负面话题的放大概率，结论可信度较高、可溯源。\n`
    }
    return null
  }

  let full = `# ${keyword} · 舆情分析报告（离线演示）\n\n> 本报告由离线演示模式生成，数据为本地预置示例，仅用于流程与效果展示。\n\n`

  const emit = async (text) => {
    full += text
    // 分块回传，模拟流式打字
    const size = 12
    for (let i = 0; i < text.length; i += size) {
      onToken?.(text.slice(i, i + size))
      await delay(24)
    }
  }

  for (const title of sectionTitles) {
    await emit(`## ${title}\n\n`)
    await emit((specialBody(title) || bodyBySection.default(title)) + '\n')
  }

  return full.trim()
}
