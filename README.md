# AgentMind · AI 多智能体舆情分析系统

> **一句话需求 → 采集 · 清洗 · 分析 · 洞察 · 论坛协作 · 报告，全自动闭环。**
>
> 输入一个关键词、一句自然语言或直接粘贴舆情文本，六个 AI 智能体依次协作，产出带情感图表、风险研判与来源溯源的完整舆情报告——支持交互式 HTML / PDF / Markdown 一键导出，可直接作为交付物。

## 🎯 产品定位

面向**舆情监测、品牌公关、市场研究与危机应对**场景的智能舆情工作站：

- 让非技术用户也能像分析师一样工作：不用写爬虫、不用懂 prompt，输入即得报告
- 每一个结论都**可溯源**（引用标注 → 来源链接）、每一个中间步骤都**看得见**（智能体产物可展开查看）
- 从"搜一下"到"交付报告"只隔一次点击

## ✨ 核心功能

### 1. 一句话输入，六个智能体全自动闭环

六步流水线各司其职，实时展示每一步的运行状态与真实中间产物：

```
① 采集 → ② 清洗 → ③ 分析 → ④ 洞察 → ⑤ 论坛协作 → ⑥ 报告
```

| 智能体 | 职责 | 中间产物（界面可展开查看） |
|--------|------|--------------------------|
| 采集 Agent | 获取舆情原始文本与来源 | 来源链接、样本列表 |
| 清洗 Agent | 去重、去广告、去无效短句 | 清洗前后条数对比、样本 |
| 分析 Agent | 情感分析、关键词与观点提取 | 情感占比、热度 Top10、观点 |
| 洞察 Agent | 趋势、风险、诉求与成因挖掘 | 风险清单、核心诉求、成因 |
| 论坛协作 | 多模型交叉验证、结论收敛 | 逐轮发言、共识/分歧、溯源 |
| 报告 Agent | 整合生成结构化报告 | 实时流式生成（思考+撰写） |

### 2. 三种输入方式，覆盖所有工作现场

| 模式 | 用法 | 数据来源 |
|------|------|----------|
| **关键词输入** | 输入 1-20 字关键词，如"新能源汽车" | 多源联网搜索 |
| **自然语言对话** | 一句话描述需求，自动解析核心对象与分析维度 | 多源联网搜索 |
| **粘贴文本** | 直接粘贴评论/帖子/讨论，每行一条 | 不依赖任何搜索 API |

### 3. 多模型协作，让结论经得起推敲

- 支持配置最多 **12 个 LLM**（OpenAI 兼容：DeepSeek / 智谱 GLM / 通义千问 / Kimi / MiniMax…）
- **并行集成**：分析阶段所有选中模型独立分析后融合（情感取均值、关键词取最大权重、观点去重合并）
- **论坛协作（ForumEngine）**：主模型担任主持人，引导验证模型**多轮交叉复核**——逐轮收敛情感占比、归纳共识与分歧、提出追问，结论完整可溯源
- **本地情感中间件**：纯 JS 中文情感词典瞬时打分，作为"校准锚点"与 LLM 结果按权重融合，零成本提升稳健性

### 4. 真实数据源，双轨采集

- **搜索 API 聚合**：Bocha 博查 + Anspire 安思派双源并行采集、合并去重，缓解单一搜索源偏差
- **MindSpider 真实爬虫**：在微博/小红书/抖音/快手/B站/贴吧/知乎按关键词**深度爬取真实社媒内容**（Playwright 浏览器自动化），输入区一键切换数据源
- **实时热搜榜**：天行数据全网热搜，点击热点即可一键分析

### 5. 可视化与趋势推演

- 情感分布饼图 + 关键词热度 Top10 柱状图（ECharts）
- 本地风险等级评估（低/中/高）+ 情绪走向预测（向好/平稳/恶化）

### 6. 四套行业报告模板，报告即交付物

| 模板 | 适用场景 |
|------|----------|
| 通用舆情分析报告 | 大多数关键词的标准分析 |
| 企业品牌声誉分析报告 | 品牌健康度评估 |
| 危机公关应对报告 | 突发负面事件的快速研判 |
| 事件舆情复盘报告 | 事件平息后的完整回顾 |

- **流式生成**：SSE 实时回传，撰写过程 + DeepSeek 思考链全程可见
- **报告 IR 化**：Markdown 解析为结构化中间表示，统一驱动多格式渲染
- **报告溯源**：事实处标注 `[n]`，对应可点击来源列表
- **多格式导出**：自包含交互式 HTML / A4 PDF / 纯文本复制

### 7. 账号体系与历史回看

- **产品落地页**：产品介绍 + 注册 / 登录（或「离线体验」免登录演示）
- **记录自动保存**：登录后每次完成的分析自动保存完整结果到账号（SQLite 落库）
- **一键回看**：「我的分析记录」面板可随时回看历史报告（图表/报告/来源原样重现，无需重跑）

### 8. 离线演示模式

无需网络、无需后端、无需任何密钥，一键开启本地预置数据演示——完整跑通六步流水线、图表、流式报告与导出，适合路演、教学与断网现场。

## 🎬 典型使用场景

| 场景 | 用法 |
|------|------|
| **舆情监测** | 输入品牌/事件关键词 → 双源采集 + 真实爬虫 → 情感分布与热度趋势 |
| **危机公关** | 选「危机公关应对报告」模板 → 快速研判风险等级与核心诉求 → 导出 PDF 上报 |
| **品牌声誉** | 选「企业品牌声誉分析报告」模板 → 多模型交叉验证 → 声誉健康度结论 |
| **事件复盘** | 事件平息后选「事件舆情复盘报告」模板 → 完整回顾 + 结论溯源 |

## 🚀 快速开始

```bash
npm install            # 1. 安装依赖
cp .env.example .env   # 2. 复制环境变量模板，填入密钥（见下表）
npm run dev:all        # 3. 同时启动前后端
# 前端 http://localhost:5173 → 后端 http://localhost:3100
```

### 必填密钥（.env）

| 配置 | 说明 |
|------|------|
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | 大模型 API（OpenAI Chat Completions 兼容），必填 |
| `BOCHA_API_KEY` 或 `ANSPIRE_API_KEY` | 搜索数据源（Bocha 博查 / Anspire 安思派，至少一个） |

### 可选配置（功能增强）

| 配置 | 效果 |
|------|------|
| `LLM2_*` ~ `LLM12_*` | 多模型协作（2 个以上启用并行集成 + 交叉复核） |
| `LLM_PRIMARY` | 指定主模型（负责清洗/洞察/报告/主持） |
| `TIANAPI_KEY` | 右侧实时热搜榜 |
| `JWT_SECRET` | 账号体系签名密钥（**生产必改**随机长串） |
| `MINDSPIDER_ENABLED=true` | 启用真实社媒爬虫数据源（见下节） |

## 🕷️ MindSpider 真实爬虫（可选数据源）

AgentMind 自带 `mindspider/` Python 组件，可在 7 大社媒平台按关键词深度爬取真实内容，**无需 MySQL**：

```bash
git submodule update --init --recursive                    # 拉取 MediaCrawler 爬虫子模块
pip install -r mindspider/requirements-bridge.txt          # 桥接最小依赖（含 cp313 wheel）
playwright install chromium                                # 浏览器驱动
# .env: MINDSPIDER_ENABLED=true  MINDSPIDER_PLATFORM=weibo
```

- 前端输入区右上角「数据源」切换为 MindSpider 爬虫，选择平台后开始分析
- **生产「无感」模式**：登录用户提交爬虫后任务进入**后台队列**（单工执行、不弹浏览器窗口），前端轮询状态，完成后自动通知（「✅ 爬虫任务完成」横幅）并接续流水线；任务 API：`POST /api/crawl/job`、`GET /api/crawl/job/:id`、`GET /api/crawl/status`
- **首次登录（一次性）**：`.env` 设 `MINDSPIDER_HEADLESS=false` 启动，提交一次任务在弹出的 Chrome 中扫码；登录态保存在本机，之后改回 `MINDSPIDER_HEADLESS=true`（默认）全程无窗口
- 调试端点：`GET /api/mindspider/hotlist`（13 平台聚合热搜）、`GET /api/mindspider/status`（环境自检）

### 生产部署架构

```
浏览器用户 ──► Node 应用（任意云主机/容器）
                  │  POST /api/crawl/job（立即返回任务 id）
                  ▼
             爬虫任务队列（单工；多实例部署换 Redis/BullMQ）
                  ▼
         Python 桥接 → Chrome/Edge CDP 无头模式
                  ▼
     平台登录态（browser_data，爬虫机本地，需持久化）
```

- 爬虫必须跑在**装有 Chrome/Edge 且已扫码登录的机器**上；Web 应用与爬虫机可分离部署（`MINDSPIDER_ROOT` 指向爬虫机上的组件路径）
- 队列并发=1：同一时间只开一个浏览器，避免资源争抢与风控；水平扩展 = 一台爬虫机一个 worker
- 登录态每 1-2 周巡检一次（`MINDSPIDER_HEADLESS=false` 重新扫码）

## 📦 技术栈

| 层面 | 技术 |
|------|------|
| 前端 | React 18 + Vite 5 |
| 图表 | ECharts 5 |
| 导出 | html2pdf.js / 交互式 HTML |
| 后端 | Express 4（Node.js ≥ 22.5，使用内置 `node:sqlite`） |
| 账号 | scrypt 密码哈希 + HS256 JWT（零外部依赖） |
| 数据源 | Bocha / Anspire / 天行热搜 / MindSpider（Playwright + MediaCrawler） |
| LLM | OpenAI Chat Completions 兼容（DeepSeek / GLM / Qwen / Kimi / MiniMax…） |

## 🚢 部署

```bash
npm run build                # Vite 构建到 dist/
node server/index.js         # 后端托管 dist/，单进程即可上线
```

- **Render**：仓库自带 `render.yaml` Blueprint，一键部署
- **Docker**：仓库自带 `Dockerfile` + `docker-compose.yml`
- 生产注意：`.env` 设置随机 `JWT_SECRET`；Node ≥ 22.5；爬虫数据源需在**有图形界面的机器**上运行并完成首次扫码登录；建议通过反向代理暴露 `/api` 并加 HTTPS

## 🔐 安全说明

- 所有密钥仅存于后端 `.env`，浏览器与打包产物不含任何密钥
- LLM 与采集请求均由后端代理转发，前端只与本地 `/api` 通信
- 账号密码 scrypt 加盐哈希存储；分析记录按用户隔离

## 📁 项目结构（开发者）

```
server/                 # Node 后端：API 代理 + 账号 + 记录 + 爬虫桥
├── index.js            # 路由：/api/collect /api/llm /api/auth /api/records ...
├── auth.js             # scrypt + JWT + requireAuth
├── db.js               # node:sqlite（users / records 表）
├── bocha.js anspire.js hotlist.js   # 搜索/热搜封装
└── mindspider.js + mindspider_bridge.py  # MindSpider 爬虫桥（Node ↔ Python）
mindspider/             # 自带 Python 爬虫组件（MediaCrawler 子模块）
src/
├── App.jsx             # 路由守卫 + 工作台（左中右三栏）
├── agents/             # 六智能体（采集/清洗/分析/洞察/论坛/报告）
├── services/           # 编排调度 + LLM/采集/账号 API + 离线演示
├── components/         # LandingPage / InputPanel / AgentFlow / ChartPanel / ReportPanel / RecordsPanel / HotList ...
├── report/             # 4 套报告模板 + IR 中间表示
└── utils/              # NLP 解析 / 趋势推演 / 本地情感词典 / HTML / PDF 导出
```

---

