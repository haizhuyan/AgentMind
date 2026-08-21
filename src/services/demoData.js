/**
 * demoData.js —— 离线演示数据与模拟返回
 * ---------------------------------------------------
 * 为「离线演示模式」提供全套本地预置数据与模拟 LLM 返回。
 * 各服务层在离线模式下调用此处函数，替代真实网络请求，使整条
 * 「采集 → 清洗 → 分析 → 洞察 → 论坛 → 报告」流水线在无网络环境下
 * 也能完整跑通，中间产物、图表、报告与导出均保持真实结构。
 *
 * 特色真实案例：胖东来正式回应“招聘20名刑释人员”
 *   —— 采集 / 分析 / 洞察 / 论坛 / 报告全部回放真实产物。
 *
 * 关键设计：LLM 调用统一经 llmService，各 Agent 以不同 system prompt
 * 区分角色。这里据 system prompt 路由到对应的模拟返回，其 JSON / Markdown
 * 结构与真实模型输出一致，因此上层 Agent 无需任何改动即可解析。
 */

// 记录最近一次演示所用关键词（清洗/分析阶段的 prompt 不含关键词时兜底）
let lastKeyword = '胖东来正式回应“招聘20名刑释人员”'

/** 模拟网络时延，让演示保留「思考」的节奏感（毫秒）；signal 中断时立刻结束。 */
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('分析已中断')
      err.name = 'AbortError'
      reject(err)
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      const err = new Error('分析已中断')
      err.name = 'AbortError'
      reject(err)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
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
export const FEATURED_KEYWORD = '胖东来正式回应“招聘20名刑释人员”'

/* ============================ 演示热搜榜 ============================ */

export const DEMO_HOTLIST = [
  { title: FEATURED_KEYWORD, digest: '胖东来回应招聘刑释人员引热议：支持者称赞人文温度与社会担当，反对者担忧公共安全与就业公平', hotnum: 58620000 },
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

/** 判断给定文本/关键词是否属于特色真实案例（胖东来招聘刑释人员）。 */
function isFeatured(text = '') {
  return /胖东来|刑释人员|刑满释放/.test(String(text))
}

// —— 真实采集：30 条舆情文本 ——
const PD_TEXTS = [
  '胖东来正式回应“招聘20名刑释人员”：招聘会严格按照国家法律法规执行,第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度 - 今日头条。8月19日深夜,胖东来官方账号发布《关于“胖东来招聘刑释人员”的初衷说明》,对近期网友热议的新门店招聘刑释人员等问题予以正式回应。胖东来对刑释人员开放招聘,是基于人性的善良、美好及对法律的尊重。2025年第一次招聘30名刑释人员,大家至今都稳定、开心地工作和健康地生活。这样做的目的是希望通过企业实践,探索一种科学、公平、稳定的“刑释人员重新就业与社会融入”的机制和方法。……',
  '胖东来正式回应“招聘20名刑释人员”_腾讯新闻。8月19日深夜,胖东来官方账号发布《关于“胖东来招聘刑释人员”的初衷说明》。胖东来对刑释人员开放招聘,是基于人性的善良、美好及对法律的尊重,希望各个群体的人们都能够得到社会的尊重和关爱,都能有尊严地生活。那些曾经犯法的人,在依法接受刑罚之后,已经是平等的社会成员和合法公民。稳定的就业帮助刑释人员重新建立尊严、价值和健康的社会关系。……',
  '胖东来正式回应“招聘20名刑释人员”:_ZAKER新闻。8月19日深夜,胖东来官方账号发布《关于“胖东来招聘刑释人员”的初衷说明》,对近期网友热议的新门店招聘刑释人员等问题予以正式回应。胖东来2025年第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度,大家至今都稳定、开心地工作和健康地生活。……',
  '胖东来深夜发文回应招聘“刑释人员”_时讯_看看新闻网。近期,胖东来要招聘“刑满释放人员”在网络引发关注。昨天深夜,胖东来创始人于东来在社交平台回应表示,招聘“刑释人员”,是基于人性的善良和美好,希望各个群体的人都能够得到社会的尊重和关爱,让每个人都有尊严地生活。引发关注的这则公告源于几天前,胖东来宣布新乡第三家门店招工约1000人,其中200个名额给退伍边防军人,并为有犯罪前科人员规划了20个岗位。……',
  '胖东来回应“招聘刑释人员”_证券要闻_股票_证券之星。8月10日晚间,胖东来创始人于东来在社交平台发文,回应“招聘刑释人员”。说明中称,此次招聘“刑释人员”,是基于人性的善良和美好,希望各个群体的人们都能够得到社会的尊重和关爱。能让每个人有尊严的生活。近日,胖东来创始人于东来发布消息称,新乡胖东来三胖开始进入招工阶段,此次预计招工名额在1000人左右。招工规划中有百分之二的名额面向有犯罪史的服刑人员,此举引发热议。',
  '胖东来回应“招聘刑满释放人员”_腾讯新闻。8月10日晚间,胖东来创始人于东来在社交平台发文,回应“招聘刑释人员”。说明中称,此次招聘“刑释人员”,是基于人性的善良和美好,希望各个群体的人们都能够得到社会的尊重和关爱。能让每个人有尊严的生活。前述说明倡导社会对刑释人员不歧视、不带有色眼镜,让他们能够被社会善良宽容的接纳。……',
  '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规:第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度_大众新闻。胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规。',
  '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规:第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度。_大众新闻。',
  '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行 - 今日头条。胖东来就招聘刑释人员一事正式回应：招聘严格依法执行，首批30名刑释人员稳定就业、无一离职，郑州店拟设专属报名通道，招聘范围将逐步开放。',
  '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行_腾讯新闻。',
  '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行_ZAKER新闻。',
  '胖东来深夜发文回应招聘“刑释人员”_时讯_看看新闻网。',
  '胖东来回应“招聘刑释人员”_证券要闻_股票_证券之星。',
  '胖东来回应“招聘刑满释放人员”_腾讯新闻。',
  '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规_大众新闻。',
  '事关招聘“刑释人员”,胖东来回应→_羊城晚报。',
  '胖东来深夜回应招聘“刑释人员”_网易新闻。',
  '胖东来深夜再回应“招聘刑释人员”_广州日报大洋网。',
  '中国慈善家杂志的微博：胖东来招聘刑释人员引发讨论，首批入职员工无一离职。',
  '胖东来招聘刑释人员引发哪些社会讨论？_新浪新闻：公共安全、就业公平与制度保障成为舆论焦点。',
  '胖东来招刑释人员引热议：善意还是冒险？_新浪新闻：支持者与反对者声音并存。',
  '网友对胖东来招聘刑满释放人员持什么态度？_新浪新闻：舆论场观点分化明显。',
  '胖东来招刑释人员引热议：澄清有门槛，首批零离职_新浪新闻。',
  '胖东来招募刑释人员引发哪些社会讨论？_新浪财经。',
  '胖东来刑释职工有半年双向试用期 探索社会重新接纳之路_中华网。',
  '纵览快评｜胖东来招刑释人员，真正的考验还在后面_河北新闻网。',
  '胖东来郑州店招刑释人员引争议 包容与底线并存_中华网。',
  '胖东来正式回应“招聘20名刑释人员” 彰显企业温度引发热议_中华网。',
  '不神化胖东来 也别急着否定刑释人员 理性看待企业担当与社会包容_中华网。',
  '小新说丨胖东来再启刑释人员招聘 谁该为“重新做人”的信任买单？_浙江新闻。'
]

// —— 真实采集：30 条来源 ——
const PD_SOURCES = [
  { title: '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行,第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度 - 今日头条', url: 'https://www.toutiao.com/article/7675993450113810990/', displayUrl: 'https://www.toutiao.com/article/7675993450113810990/' },
  { title: '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行,第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度_腾讯新闻', url: 'https://news.qq.com/rain/a/20260820A083IG00', displayUrl: 'https://news.qq.com/rain/a/20260820A083IG00' },
  { title: '胖东来正式回应“招聘20名刑释人员”:招聘会严格按照国家法律法规执行_ZAKER新闻', url: 'http://app.myzaker.com/news/article.php?pk=6a869d788e9f0926d60e3b43', displayUrl: 'http://app.myzaker.com/news/article.php?pk=6a869d788e9f0926d60e3b43' },
  { title: '胖东来深夜发文回应招聘“刑释人员”_时讯_看看新闻网', url: 'https://www.kankanews.com/detail/D1ypPxembym', displayUrl: 'https://www.kankanews.com/detail/D1ypPxembym' },
  { title: '胖东来回应“招聘刑释人员”_证券要闻_股票_证券之星', url: 'https://wap.stockstar.com/detail/IG2025081100017889', displayUrl: 'https://wap.stockstar.com/detail/IG2025081100017889' },
  { title: '胖东来回应“招聘刑满释放人员”_腾讯新闻', url: 'https://news.qq.com/rain/a/20250811A04B6U00', displayUrl: 'https://news.qq.com/rain/a/20250811A04B6U00' },
  { title: '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规:第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度#胖东来 #招聘“刑释人员” #刑释人员 #招聘_大众新闻_大众新媒体大平台', url: 'https://dzrb.dzng.com/videos/0/NEWS3620173KHVQKAMZUQGUH', displayUrl: 'https://dzrb.dzng.com/videos/0/NEWS3620173KHVQKAMZUQGUH' },
  { title: '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规:第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度。_大众新闻_大众新媒体大平台', url: 'https://dzrb.dzng.com/videos/0/NEWS3620122BRKWWSVVLRLSY', displayUrl: 'https://dzrb.dzng.com/videos/0/NEWS3620122BRKWWSVVLRLSY' },
  { title: '胖东来回应“招聘刑释人员”_股票频道_证券之星', url: 'https://stock.stockstar.com/IG2025081100017889.shtml', displayUrl: 'https://stock.stockstar.com/IG2025081100017889.shtml' },
  { title: '胖东来发声明再回应招聘“刑释人员”,强调严格执行国家相关的法律法规:第一次招聘30名刑释人员,是先从中轻度犯罪类型逐步开放至中重度 - 今日头条', url: 'https://www.toutiao.com/article/7675990545268834851/', displayUrl: 'https://www.toutiao.com/article/7675990545268834851/' },
  { title: '胖东来拟招20名刑释人员上热搜,网友涌入于东来账号评论区求职,有前科人员:看到了希望(原创采访)|求职_新浪新闻', url: 'https://k.sina.com.cn/article_1720962692_m6693ce8402002w632.html', displayUrl: 'https://k.sina.com.cn/article_1720962692_m6693ce8402002w632.html' },
  { title: '胖东来深夜发文回应招聘“刑释人员”_时讯_看看新闻网', url: 'https://m.kankanews.com/detail/D1ypPxembym', displayUrl: 'https://m.kankanews.com/detail/D1ypPxembym' },
  { title: '事关招聘“刑释人员”,胖东来回应→', url: 'https://news.ycwb.com/ikinvkctjj/content_53596894.htm', displayUrl: 'https://news.ycwb.com/ikinvkctjj/content_53596894.htm' },
  { title: '胖东来深夜回应招聘“刑释人员”', url: 'https://c.m.163.com/news/a/K6M3IS300550B6IS.html?from=subscribe', displayUrl: 'https://c.m.163.com/news/a/K6M3IS300550B6IS.html?from=subscribe' },
  { title: '胖东来深夜再回应“招聘刑释人员”_广州日报大洋网', url: 'https://news.dayoo.com/society/202608/20/140000_54992834.htm', displayUrl: 'https://news.dayoo.com/society/202608/20/140000_54992834.htm' },
  { title: '中国慈善家杂志的微博', url: 'https://m.weibo.cn/detail/5334026802178789', displayUrl: 'm.weibo.cn' },
  { title: '胖东来招聘刑释人员引发哪些社会讨论？', url: 'https://k.sina.cn/article_7879848931_1d5acf3e306801c1z6.html', displayUrl: 'k.sina.cn' },
  { title: '胖东来招刑释人员引热议：善意还是冒险？', url: 'https://k.sina.com.cn/article_7880068248_1d5b04c9806801h6gq.html', displayUrl: 'k.sina.com.cn' },
  { title: '网友对胖东来招聘刑满释放人员持什么态度？', url: 'https://k.sina.com.cn/article_7880068208_1d5b04c7006801wu9m.html', displayUrl: 'k.sina.com.cn' },
  { title: '胖东来招刑释人员引热议：澄清有门槛，首批零离职', url: 'https://k.sina.com.cn/article_7879848931_1d5acf3e306801c1pk.html', displayUrl: 'k.sina.com.cn' },
  { title: '胖东来招募刑释人员引发哪些社会讨论？', url: 'https://cj.sina.com.cn/articles/view/7879996019/1d5af327306801biri', displayUrl: 'cj.sina.com.cn' },
  { title: '胖东来刑释职工有半年双向试用期 探索社会重新接纳之路', url: 'https://3g.china.com/act/news/10000169/20260820/49687971.html', displayUrl: '3g.china.com' },
  { title: '纵览快评｜胖东来招刑释人员，真正的考验还在后面', url: 'https://comment.hebnews.cn/2026-08/19/content_9547971.htm', displayUrl: 'comment.hebnews.cn' },
  { title: '胖东来郑州店招刑释人员引争议 包容与底线并存', url: 'https://3g.china.com/act/news/10000169/20260814/49676256.html', displayUrl: '3g.china.com' },
  { title: '胖东来正式回应“招聘20名刑释人员” 彰显企业温度引发热议', url: 'https://news.china.com/socialgd/10000169/20260820/49688683.html', displayUrl: 'news.china.com' },
  { title: '网友对胖东来招聘刑释人员的主要争议是什么？', url: 'https://cj.sina.cn/articles/view/7879776326/1d5abd84606801c3o6', displayUrl: 'cj.sina.cn' },
  { title: '专家解读胖东来招聘刑释人员|胖东来|刑释人员|打破歧视|谭刚强_新浪新闻', url: 'https://www.sina.cn/news/detail/5333028587186412.html', displayUrl: 'www.sina.cn' },
  { title: '胖东来再招刑释人员引争议|胖东来|刑释人员_新浪新闻', url: 'https://www.sina.cn/news/detail/5332997658119251.html', displayUrl: 'www.sina.cn' },
  { title: '不神化胖东来 也别急着否定刑释人员 理性看待企业担当与社会包容', url: 'https://news.china.com/socialgd/10000169/20260818/49683474.html', displayUrl: 'news.china.com' },
  { title: '小新说丨胖东来再启刑释人员招聘 谁该为“重新做人”的信任买单？', url: 'http://zjnews.zjol.com.cn/yc/qmt/202608/t20260818_31856161.shtml', displayUrl: 'zjnews.zjol.com.cn' }
]

// —— 分析阶段（多模型集成后的真实产物）——
const PD_SENTIMENT = { positive: 50, negative: 21, neutral: 29 }

const PD_KEYWORDS = [
  { word: '胖东来', weight: 100 },
  { word: '刑释人员', weight: 95 },
  { word: '招聘', weight: 90 },
  { word: '于东来', weight: 85 },
  { word: '回应', weight: 80 },
  { word: '争议', weight: 75 },
  { word: '人文关怀', weight: 75 },
  { word: '社会包容', weight: 70 },
  { word: '尊严', weight: 70 },
  { word: '善良', weight: 70 }
]

// —— 各模型独立观点（集成后取并集，还原多模型丰富度）——
const PD_OPINIONS_BY_MODEL = {
  'demo-kimi': [
    '胖东来回应招聘刑释人员是基于人性善良与法律尊重，旨在帮助其融入社会、有尊严生活，并强调会严格执行国家法律法规。',
    '舆论场观点分化明显：部分网友称赞企业有人文温度与社会担当，也有网友质疑此举或带来公共安全隐患、对普通求职者不公。',
    '公司披露去年首批入职的刑释人员稳定就业、无一离职，今年郑州店计划招聘刑期5年以上的刑释人员，并设专属报名通道。',
    '争议焦点集中于公共安全焦虑、就业公平与受害方情感，反映出社会对刑释人员重新接纳仍存顾虑与两难心态。',
    '有评论及专家指出应理性看待，既不神化胖东来也不标签化刑释人员，强调包容需有制度保障，该模式不可盲目照搬。'
  ],
  'demo-deepseek': [
    '胖东来招聘刑释人员是基于人性善良和法律尊重，旨在帮助其重新融入社会。',
    '社会对刑释人员应不歧视、不戴有色眼镜，给予平等机会和尊严。',
    '公众担忧公共安全风险，认为商超环境可能对顾客构成隐患。',
    '部分网友质疑就业公平，认为对刑释人员特殊照顾可能影响普通求职者。',
    '胖东来强调招聘严格依法执行，首批刑释人员无一离职，证明模式可行。'
  ],
  'demo-glm': [
    '胖东来官方回应称招聘刑释人员是基于人性善良与法律尊重，旨在帮助该群体有尊严地融入社会',
    '舆论呈现两极分化，支持者赞扬企业体现社会担当与温度，反对者则担忧公共安全与就业公平',
    '胖东来强调招聘将严格守法，采取从中轻度到中重度逐步开放的策略，并披露首批员工零离职',
    '事件引发了社会对刑释人员回归、打破歧视标签与保障公众安全之间平衡的深层讨论',
    '胖东来招聘刑释人员是基于人性善良和对法律的尊重，旨在帮助刑释人员重新融入社会，获得平等尊严和生活机会。'
  ],
  'demo-qwen': [
    '胖东来强调招聘严格执行国家法律法规，首次招聘从中轻度犯罪类型逐步开放，并设置双向试用期等管理机制。',
    '舆论对胖东来此举呈现两极分化：支持者称赞其彰显企业温度与社会担当，反对者担忧公共安全隐患和就业公平问题。',
    '胖东来披露首批招聘的刑释人员无一离职、稳定就业，以此回应外界质疑并证明该模式的可行性。',
    '专家及评论认为应理性看待企业担当与社会包容，既不应神化胖东来，也不应盲目否定刑释人员重新做人的机会。',
    '胖东来基于人性善良、美好及对法律的尊重，为刑释人员提供就业机会，体现企业社会责任和人文关怀'
  ],
  'demo-minimax': [
    '首批30名刑释人员入职后无一离职，证明该招聘模式具有一定可行性和稳定性',
    '网友争议主要集中在三个方面：公共安全担忧、就业公平问题、对重刑犯（刑期5年以上）是否适合在商超工作的质疑',
    '胖东来严格按照国家法律法规执行招聘，从轻中度犯罪类型逐步开放至中重度，体现渐进式社会融入尝试',
    '社会对刑释人员存在标签化和边缘化现象，需要通过企业示范推动公众改变对刑释人员的认知和接纳'
  ]
}

// —— 洞察阶段 ——
const PD_INSIGHT = {
  trend:
    '舆情整体呈现正面略占优但高度两极分化的态势，随着胖东来正式回应并披露首批刑释人员零离职数据，情绪面趋于理性降温；舆论焦点正从初期的情绪化质疑（安全/公平）转向对企业管理制度、社会包容边界与公共安全如何平衡的深层公共讨论，预计短期内争议余波将持续但不会大规模失控。',
  risks: [
    '若入职刑释人员出现任何个别负面事件，舆论将迅速反噬并全盘否定该模式，导致胖东来品牌声誉严重受损',
    '公众对刑期5年以上重刑犯在商超一线岗位的安全焦虑持续存在，可能转化为消费者用脚投票或监管介入压力',
    '为刑释人员设置专属报名通道被质疑就业逆向歧视，可能引发普通求职者群体的不满与公平性质询',
    '对犯罪受害者情感需求的忽视可能触发次生舆情，形成对胖东来"伪善"的道德指控',
    '其他企业盲目效仿胖东来模式但缺乏配套管理机制，引发更大范围的社会争议与法律风险',
    '标签化思维下，刑释人员一旦与顾客或同事发生冲突，极易被舆论放大为群体性问题'
  ],
  demands: [
    '顾客与公众要求企业透明公开刑释人员的筛选标准、岗位安排及动态管理机制，以消除公共安全隐患',
    '普通求职者呼吁保障就业公平，反对以企业社会责任之名行特殊照顾之实',
    '社会公众期待在法治框架内实现对刑释人员的包容与尊严保障，反对任何形式的就业歧视',
    '舆论要求企业建立完善的培训、评估与双向试用期制度，证明该模式具备可持续性与可复制性',
    '专家与理性声音呼吁不要将企业神化，也不要将刑释人员妖魔化，需以制度而非道德绑架推动社会融入'
  ],
  cause:
    '舆情爆发的核心原因在于胖东来作为高关注度零售企业，其突破常规的用工举措触动了社会关于"安全焦虑"与"道德宽容"的深层神经；加之公众对刑释人员存在普遍的信息不对称与标签化认知，而企业正式回应该议题又将原本潜在的讨论推向公共议程。与此同时，社会正处于对公平正义、弱者关怀高度敏感的阶段，胖东来过往积累的品牌声誉既让公众愿意给予善意期待，也使其非常规行为更容易被放在放大镜下审视，从而引发对企业责任边界、法律合规与社会接纳尺度的激烈碰撞。'
}

// —— 论坛发言（按 模型 + 轮次）——
const PD_FORUM_SPEECH = {
  1: {
    'demo-deepseek':
      '情感占比正面50%偏高，负面21%可能低估了争议强度。当前结论强调理性降温，但风险分析已指出安全焦虑和就业公平等核心分歧，负面情绪应更高。建议补充对受害方情感和制度保障的讨论。',
    'demo-glm':
      '情感占比中负面情绪被低估，招聘重刑犯（5年以上）引发的安全焦虑在舆论场更为强烈，实际负面恐超30%。风险分析侧重外部声誉，忽略了内部员工抵触及顾客现场冲突的即时管理压力。建议补充对受害者群体情感抚慰的具体诉求。',
    'demo-qwen':
      '当前情感占比基本合理，正面略高符合胖东来品牌光环效应，但负面可能被低估，因安全与公平焦虑在评论区占比较高且情绪激烈。风险识别较全面，但遗漏了"刑释人员隐私保护"与"员工内部排斥"两类次生风险。诉求中缺少对"岗位隔离是否合理"的讨论。',
    'demo-minimax':
      '复核认为情感占比总体合理但正面略高估。当前各模型分歧大(正面30%-63%)，考虑到安全焦虑和公平质疑的实际声量，负面25%-28%、正面45%-48%更准确。风险评估较全面但遗漏了法律诉讼风险(员工/顾客纠纷)和同行竞争者借势炒作风险。诉求分析缺少刑释人员自身群体的融入需求和职业发展诉求，以及投资者对企业经营风险的关注。洞察结论整体准确，但"正面略占优"的判断可更谨慎。'
  },
  2: {
    'demo-deepseek':
      '跨模型情感偏差大，建议引入分层抽样与人工标注基线校准。岗位边界需明确禁止接触顾客隐私、现金等敏感岗位，并建立动态评估与匿名化应急机制。同时应纳入受害者、员工等沉默方诉求，避免舆论单一化。',
    'demo-glm':
      '情感量化偏差大，需引入人工基线校准。当前分析对“重刑犯”岗位边界界定模糊，未明确是否限制接触现金或儿童等敏感场景。此外，忽略了内部员工对职场安全的隐性焦虑及投资者对品牌波动的担忧，需补充针对重刑犯的分级隔离与动态熔断机制。',
    'demo-qwen':
      '情感占比上，本地词典正面63%显著偏高，未充分识别"阴阳怪气"式反讽与隐性质疑，综合各模型，正面应下调至40%左右，中性上调。当前结论对"受害者情感"与"内部员工安全感"挖掘不足，且对重刑犯岗位边界缺乏实操指引。建议引入分层抽样+人工标注基线校准情感，并针对重刑犯设定非现金、非核心动线、双人复核等硬性岗位边界与熔断机制。',
    'demo-minimax':
      '复核结论：情感占比方面，当前正面47%略偏高，跨模型偏差达33个百分点（30%-63%），反映量化方法论存在显著问题；建议引入分层抽样校准后重新评估。风险与诉求基本覆盖，但遗漏了投资者风险视角及刑释人员自身融入难度的隐性诉求。主持人提出的两个聚焦问题极具价值：方法论层面需建立统一的情感基线校准机制；制度层面当前结论缺乏对岗位边界、动态评估、隐私保护等可操作机制的深入论证，仍停留在价值对立层面，未能转向主持人期望的制度可行性论证。'
  }
}

// —— 各验证模型的一致度（轮次 → 模型）——
const PD_FORUM_AGREEMENT = {
  1: { 'demo-deepseek': 78, 'demo-glm': 78, 'demo-qwen': 78, 'demo-minimax': 78 },
  2: { 'demo-deepseek': 72, 'demo-glm': 72, 'demo-qwen': 72, 'demo-minimax': 72 }
}

// —— 各验证模型的分歧点（轮次 → 模型）——
const PD_FORUM_DISPUTES = {
  1: {
    'demo-deepseek': ['负面情感占比可能被低估'],
    'demo-glm': ['内部员工抵触及顾客现场冲突的即时管理压力被忽略'],
    'demo-qwen': ['遗漏刑释人员隐私保护与员工内部排斥两类次生风险'],
    'demo-minimax': ['遗漏法律诉讼风险与同行竞争者借势炒作风险']
  },
  2: {}
}

// —— 各验证模型的补充建议（轮次 → 模型）——
const PD_FORUM_SUPPLEMENT = {
  1: {
    'demo-deepseek': ['补充对受害方情感与制度保障的讨论'],
    'demo-glm': ['补充受害者群体情感抚慰的具体诉求'],
    'demo-qwen': ['补充岗位隔离是否合理的讨论'],
    'demo-minimax': ['补充刑释人员自身融入需求与投资者风险视角']
  },
  2: {
    'demo-deepseek': ['建立动态评估与匿名化应急机制'],
    'demo-glm': ['分级隔离与动态熔断机制'],
    'demo-qwen': ['非现金、非核心动线、双人复核等硬性岗位边界'],
    'demo-minimax': ['引入分层抽样校准并补充投资者风险视角']
  }
}

// —— 主持人归纳（轮次）——
const PD_HOST = {
  1: {
    summary:
      '本轮围绕胖东来招聘刑释人员（含去年首批30人及今年郑州店计划招聘20名刑期5年以上人员）的舆情展开验证。各Agent确认核心事实：企业以‘人性善良与法律尊重’为由正式回应，披露首批零离职数据，并设专属报名通道；舆论在品牌光环下呈现两极分化，焦点已从情绪化道德评判转向公共安全、就业公平与制度保障的深层张力。但在情感占比量化、风险盲区识别及‘理性降温’判断上存在显著分歧。',
    consensus: [
      '当前情感占比中正面倾向（尤其是本地情感词典的63%及各模型偏乐观区间）存在不同程度高估，负面焦虑（安全、公平）存在系统性低估。',
      '公共安全风险、就业公平性质疑与企业制度保障缺失，是各方共同识别的核心矛盾。',
      '现有风险与诉求框架存在明显盲区，需补充内部员工心理、犯罪受害者情感、刑释人员隐私保护及法律诉讼等次生维度。'
    ],
    divergences: [
      '负面情感修正幅度的量化分歧：DeepSeek认为负面21%显著低估；智谱主张实际负面应超30%；MiniMax建议修正为负面25%-28%、正面45%-48%；通义则认为整体框架基本合理仅需微调。',
      '风险优先级认定不一：智谱侧重内部员工抵触及顾客现场即时冲突；DeepSeek强调受害方情感抚慰与制度保障；通义聚焦隐私泄露与内部排斥；MiniMax提出法律诉讼与同行竞争者借势炒作风险。',
      '对‘舆情理性降温’判断存在分歧：部分Agent认为评论区情绪仍激烈，当前‘降温’结论偏乐观，实质处于高位对峙而非收敛。',
      '方法学张力：本地情感词典（正面63%）与语义理解模型（正面30%-60%）的结果离散，反映出词典法与上下文理解在反讽、质疑及复杂情感识别上的方法论差异。'
    ],
    questions: [
      '如何建立统一的校准机制（如引入评论区分层抽样或人工标注基线），弥合正面30%-63%的跨模型量化偏差？',
      '针对刑期5年以上人员在商超一线岗位的特殊性，应设定哪些可操作的岗位边界、动态评估、隐私保护与应急响应机制，以实质回应安全焦虑？',
      '除显性网络声量外，如何系统纳入犯罪受害者、内部员工、刑释人员自身及投资者等‘沉默利益相关方’的隐性诉求，避免分析被单一舆论场主导？'
    ],
    focus: '下一轮聚焦情感量化校准方法与重刑犯岗位边界等制度设计的实操论证'
  },
  2: {
    summary:
      '本轮讨论围绕胖东来招聘刑释人员舆情的情感量化偏差与制度设计盲区展开。各Agent普遍指出当前情感分析存在显著的跨模型偏差（正面占比30%-63%不等），本地词典对反讽及隐性质疑识别不足；同时一致认为原始结论对重刑犯岗位边界、动态管理机制的论述停留在价值层面，缺乏商超场景下的硬约束与实操指引，且系统性遗漏了内部员工安全感、受害者情感、投资者风险及刑释人员自身融入难度等沉默方诉求。',
    consensus: [
      '情感量化存在显著跨模型偏差，必须引入分层抽样与人工标注基线进行校准',
      '当前分析对重刑犯岗位边界界定模糊，缺乏商超场景下的硬性隔离与动态管理机制',
      '分析框架遗漏了关键利益相关方，需纳入内部员工、受害者、投资者及刑释人员自身的隐性诉求',
      '讨论应从价值对立转向制度可行性论证，建立可操作的评估、熔断与复核机制'
    ],
    divergences: [
      '情感偏差幅度认定不一：通义千问认为正面应下调至40%左右，MiniMax认为当前47%略偏高，DeepSeek与智谱仅指出偏差大但未给出具体修正值',
      '机制侧重不同：DeepSeek强调匿名化应急与隐私保护，智谱强调分级隔离与动态熔断，通义千问强调非现金/非核心动线/双人复核等硬性岗位边界',
      'MiniMax认为当前整体结论仍停留在价值对立层面，尚未完成向制度可行性论证的转向，批判深度高于其他Agent',
      '本地情感词典（63%正面）与综合模型结论（45%正面）之间存在33个百分点的显著偏差，各Agent均质疑其有效性但未形成统一修正方案'
    ],
    questions: [
      '如何建立统一的情感量化基线校准机制，以消除跨模型偏差并有效识别反讽、隐性质疑等"噪声"情绪？',
      '针对刑期5年以上的重刑犯，在商超一线场景中应设定哪些可量化、可执行的硬性岗位边界与动态熔断标准？',
      '如何设计系统性的利益相关方映射框架，将内部员工、受害者、投资者及刑释人员自身的隐性焦虑纳入风险监测与诉求响应机制？'
    ],
    focus: '收敛结论：情感占比校准为正面45%、负面28%、中性27%，并明确制度设计的可操作机制'
  }
}

// —— 报告（思考过程 + 6 章节，与最终报告文件一致）——
const PD_REPORT = {
  reasoning: [
    '正在整合采集、清洗、分析、洞察与两轮论坛协作的结论……\n',
    '核心事实：胖东来就“招聘20名刑释人员”正式回应，招聘严格依法执行，首批30名刑释人员稳定就业无一离职，郑州店拟设专属报名通道。\n',
    '注意到论坛校准：本地情感词典正面占比偏高，经跨模型校准后修正为正面45%、负面28%、中性27%。\n',
    '按《通用舆情分析报告》章节大纲组织正文，并在引用事实处标注来源编号。\n'
  ],
  sections: [
    {
      title: '舆情概况',
      body:
        '胖东来就“招聘20名刑释人员”一事发布正式声明，强调招聘严格遵循国家法律法规，首批30名刑释人员已稳定就业且无一离职，并计划将招聘范围从中轻度犯罪类型逐步开放至中重度，郑州店拟设专属报名通道招聘刑期5年以上人员 [1][2][11][20]。事件经主流新闻平台及社交媒体扩散后引发广泛讨论，有效样本24条，舆论场呈现高度聚焦与两极分化态势 [情感与观点分析]。目前舆情整体处于观望期，情绪面随企业披露零离职数据后趋于理性降温，但核心争议未消 [深度洞察trend]。'
    },
    {
      title: '情感分析',
      body:
        '经多Agent交叉验证校准，当前舆情情感占比约为：正面45%、负面28%、中性27% [多Agent辩论calibratedSentiment]。本地情感词典原始正面占比63%因对反讽及隐性质疑识别不足存在显著高估，校准后正面情感回落至45%左右 [多Agent辩论]。\n\n情绪主导面呈现“正面略占优但高度两极分化”特征，而非单向乐观。支持声音称赞企业彰显人文温度与社会担当 [25][29]；反对声音则集中表达对公共安全的焦虑、对就业逆向歧视的质疑，以及对重刑犯在商超一线岗位适配性的担忧 [11][18][24][26]。实质情绪处于高位对峙状态，隐性负面与观望情绪交织 [多Agent辩论disputes]。'
    },
    {
      title: '深度洞察',
      body:
        '舆情爆发的核心原因在于，胖东来作为高关注度零售企业，其突破常规的用工举措触动了社会关于“安全焦虑”与“道德宽容”的深层神经；加之公众对刑释人员普遍存在信息不对称与标签化认知，而企业的正式回应又将该议题推向公共议程，引发对企业责任边界、法律合规与社会接纳尺度的激烈碰撞 [深度洞察cause]。\n\n核心诉求包括：\n\n- **制度透明**：公众要求企业公开刑释人员的筛选标准、岗位安排及动态管理机制，以消除公共安全隐患 [深度洞察demands]；\n- **就业公平**：普通求职者呼吁反对以企业社会责任之名行特殊照顾之实，保障就业公平 [深度洞察demands]；\n- **法治包容**：社会期待在法治框架内实现对刑释人员的包容与尊严保障，反对任何形式的就业歧视 [深度洞察demands]；\n- **可持续验证**：舆论要求企业建立完善的培训、评估与双向试用期制度，证明该模式具备可复制性 [深度洞察demands]；\n- **理性框架**：专家及理性声音呼吁既不神化胖东来，也不标签化刑释人员，以制度而非道德绑架推动社会融入 [29][深度洞察demands]。'
    },
    {
      title: '趋势与风险',
      body:
        '研判走向：舆情方向总体平稳，正负情绪相对均衡，处于观望期；短期内争议余波将持续，但不会大规模失控 [趋势预测][深度洞察trend]。\n\n风险等级：中（50分） [趋势预测riskLevel]。\n\n主要风险点：\n\n- **声誉反噬风险**：若入职刑释人员出现任何个别负面事件，舆论将迅速反噬并全盘否定该模式，导致品牌声誉严重受损 [深度洞察risks][趋势预测watchPoints]；\n- **安全焦虑与监管压力**：公众对刑期5年以上重刑犯在商超一线岗位的安全焦虑持续存在，可能转化为消费者用脚投票或监管介入压力 [深度洞察risks][趋势预测watchPoints][24]；\n- **逆向歧视争议**：为刑释人员设置专属报名通道被质疑就业逆向歧视，可能引发普通求职者群体的不满与公平性质询 [深度洞察risks][趋势预测watchPoints]；\n- **受害者次生舆情**：对犯罪受害者情感需求的忽视可能触发次生舆情，形成对胖东来“伪善”的道德指控 [深度洞察risks]；\n- **内部与资本风险**：内部员工心理安全与团队融合隐患，以及投资者对品牌声誉波动和ESG风险的担忧 [多Agent辩论supplement]；\n- **盲目效仿风险**：其他企业若缺乏配套管理机制而盲目效仿，可能引发更大范围的社会争议与法律风险 [深度洞察risks]。'
    },
    {
      title: '应对建议',
      body:
        '处置建议：\n\n- **硬化岗位边界**：明确刑释人员禁止接触收银、金库、安保及儿童区等敏感岗位，限定于仓储、后勤等非核心动线，实行双人复核与电子围栏管理 [多Agent辩论supplement]；\n- **建立熔断机制**：构建季度心理/行为评估体系，设置三级预警与即时停岗熔断机制，并设匿名举报与应急响应预案 [多Agent辩论supplement]；\n- **强化隐私与反标签化**：内部知情最小化，对外脱敏披露，防止刑释人员被标签化或遭遇网暴 [多Agent辩论supplement]；\n- **纳入沉默利益相关方**：设立受害者代表咨询通道、内部员工匿名反馈机制及投资者ESG风险专项披露，系统回应多方隐性焦虑 [多Agent辩论supplement]。\n\n传播建议：\n\n- **转叙事重点**：从“善良/道德”叙事转向“依法依规+制度保障”叙事，避免道德绑架 [29]；\n- **数据释疑**：定期发布就业跟踪与评估报告，以事实数据（如零离职、双向试用期表现）降低公众焦虑 [20]；\n- **议题引导**：主动邀请法律与社会学专家解读，推动舆论从价值对立转向制度可行性讨论 [27]。'
    },
    {
      title: '结论溯源',
      body:
        '本报告核心结论基于多Agent辩论与交叉验证机制形成。经2轮论坛协作，由DeepSeek、智谱GLM-4.7、通义千问、MiniMax等模型复核，末轮一致度达72%，多轮交叉验证通过，整体可信度高 [多Agent辩论trace]。\n\n关键校准包括：本地情感词典原始正面占比63%因未能有效识别反讽与隐性质询而被显著高估，经跨模型校准后修正为正面45%、负面28%、中性27% [多Agent辩论calibratedSentiment]。同时，原始分析框架经辩论补充，纳入了内部员工心理安全、投资者ESG声誉风险、犯罪受害者情感诉求及刑释人员隐私保护等“沉默利益相关方”视角，弥补了单一舆论场分析的盲区 [多Agent辩论supplement]。'
    }
  ]
}

/** 真实案例·清洗：剔除第 7 的倍数位置（30 → 24 条，还原真实去噪比例）。 */
function pdClean(user) {
  let list = []
  const m = user.match(/\[[\s\S]*\]/)
  if (m) {
    try {
      list = JSON.parse(m[0])
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list) || !list.length) return JSON.stringify({ cleaned: [] })
  return JSON.stringify({ cleaned: list.filter((_, i) => (i + 1) % 5 !== 0) })
}

/** 真实案例·分析：按模型返回其独立观点（集成后取并集还原多模型丰富度）。 */
function pdAnalyze(model) {
  const opinions = PD_OPINIONS_BY_MODEL[model] || PD_OPINIONS_BY_MODEL['demo-kimi']
  return JSON.stringify({
    sentiment: { ...PD_SENTIMENT },
    keywords: PD_KEYWORDS,
    opinions
  })
}

/** 真实案例·论坛：按 模型 + 轮次 返回该验证 Agent 的发言与评估。 */
function pdCritic(model, round) {
  const r = PD_FORUM_SPEECH[round] ? round : 1
  return JSON.stringify({
    content: PD_FORUM_SPEECH[r]?.[model] || '结论方向认同，细节以主持人归纳为准。',
    sentiment: r === 1 ? { positive: 40, negative: 35, neutral: 25 } : { positive: 45, negative: 28, neutral: 27 },
    agreement: PD_FORUM_AGREEMENT[r]?.[model] ?? 72,
    disputes: PD_FORUM_DISPUTES[r]?.[model] || [],
    supplement: PD_FORUM_SUPPLEMENT[r]?.[model] || []
  })
}

/** 真实案例·报告：流式回放真实报告（思考过程 + 6 章节）。 */
async function pdReportStream({ onToken, onReasoning, signal }) {
  if (onReasoning) {
    for (const t of PD_REPORT.reasoning) {
      onReasoning(t)
      await delay(220, signal)
    }
  }
  let full = ''
  const emit = async (text) => {
    full += text
    const size = 12
    for (let i = 0; i < text.length; i += size) {
      onToken?.(text.slice(i, i + size))
      await delay(20, signal)
    }
  }
  for (const sec of PD_REPORT.sections) {
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
      texts: [...PD_TEXTS],
      sources: [...PD_SOURCES],
      aiSummary:
        '胖东来就“招聘20名刑释人员”正式回应：招聘严格遵循国家法律法规，首批30名刑释人员稳定就业且无一离职，郑州店拟设专属报名通道；舆论场高度聚焦，情感呈现两极分化态势。'
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
 * 命中特色真实案例（胖东来招聘刑释人员）时回放真实产物，否则用通用合成数据。
 * @param {string} system
 * @param {string} user
 * @param {string} [model] 调用模型 id（用于分析/论坛按模型返回真实差异化产物）
 * @returns {Promise<string>}
 */
export async function demoLLM({ system = '', user = '', model, signal } = {}) {
  await delay(300 + Math.random() * 400, signal)
  const featured = isFeatured(user)
  const keyword = extractKeyword(user)

  if (system.includes('清洗')) {
    return featured ? pdClean(user) : fakeClean(user)
  }
  if (system.includes('舆情分析师')) {
    return featured ? pdAnalyze(model) : fakeAnalyze(keyword)
  }
  if (system.includes('洞察')) {
    return featured ? JSON.stringify(PD_INSIGHT) : fakeInsight(keyword)
  }
  if (system.includes('主持人')) {
    const rm = user.match(/当前轮次：第\s*(\d+)/)
    const round = rm ? Number(rm[1]) : 1
    return featured ? JSON.stringify(PD_HOST[round] || PD_HOST[1]) : fakeHost(keyword, round)
  }
  if (system.includes('验证') || system.includes('质检') || system.includes('辩论')) {
    // 论坛发言可能含「主持人引导」，据此粗略区分轮次
    const round = user.includes('主持人引导') ? 2 : 1
    return featured ? pdCritic(model, round) : fakeCritic(round)
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
export async function demoLLMStream({ system = '', user = '', onToken, onReasoning, signal }) {
  // 特色真实案例：流式回放真实报告
  if (isFeatured(user)) {
    return pdReportStream({ onToken, onReasoning, signal })
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
      await delay(200, signal)
    }
  }

  const bodyBySection = {
    default: (title) => `围绕「${keyword}」的${title}部分：整体舆情中性偏正，正面集中在性价比与服务体验，负面集中在价格与售后流程，需持续关注个案传播与拐点变化。`
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
      await delay(24, signal)
    }
  }

  for (const title of sectionTitles) {
    await emit(`## ${title}\n\n`)
    await emit((specialBody(title) || bodyBySection.default(title)) + '\n')
  }

  return full.trim()
}
