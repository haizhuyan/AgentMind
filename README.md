# AgentMind · AI 多智能体舆情分析系统

> **一句话需求 → 采集 · 清洗 · 分析 · 洞察 · 论坛协作 · 报告，全自动闭环。**
>
> 输入一个关键词、一句自然语言或直接粘贴舆情文本，六个 AI 智能体依次协作，产出带情感图表、风险研判与来源溯源的完整舆情报告——支持交互式 HTML / Markdown 一键导出，可直接作为交付物。

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
| **关键词检索** | 输入 1-20 字关键词或一句话需求 | 多源联网搜索 / 爬虫 |
| **自然语言追问** | 报告生成后就同一报告继续讨论 | 基于当前报告（不新开流水线） |
| **文本上传** | 上传 .txt / .md 等舆情文本文件 | 不依赖搜索 API |

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
- **多格式导出**：自包含交互式 HTML / 纯文本复制

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
| **危机公关** | 选「危机公关应对报告」模板 → 快速研判风险等级与核心诉求 → 导出 HTML 上报 |
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
| `TIANAPI_KEY` | 实时热搜榜（工作台空态展示，点击热点一键分析） |
| `JWT_SECRET` | 账号体系签名密钥（**生产必改**随机长串） |
| `MINDSPIDER_ENABLED=true` | 启用真实社媒爬虫数据源（见下节） |

## 🕷️ MindSpider 真实爬虫（可选数据源）

AgentMind 自带 `mindspider/`（含 MediaCrawler），可在微博 / 小红书 / 抖音 / 快手 / B站 / 贴吧 / 知乎按关键词深度爬取真实内容，**无需 MySQL**。

前端输入区右上角「数据源」切到 **MindSpider 爬虫**，选平台后开始分析。登录用户提交后任务进**后台队列**（单工），完成后自动接续流水线。

| 配置 | 说明 |
|------|------|
| `MINDSPIDER_ENABLED=true` | 启用爬虫数据源 |
| `MINDSPIDER_PLATFORM=weibo` | 默认平台（也可前端选） |
| `MINDSPIDER_PYTHON` | Python 解释器（Docker 内已设为 `/opt/venv/bin/python`） |
| `MINDSPIDER_HEADLESS` | `true` 日常无头；`false` 扫码时有界面（见下） |

调试：`GET /api/mindspider/status`、`GET /api/mindspider/hotlist`

### 本地开发（非 Docker）

```bash
git submodule update --init --recursive
pip install -r mindspider/requirements-bridge.txt
playwright install chromium
# .env：MINDSPIDER_ENABLED=true  MINDSPIDER_PLATFORM=weibo
```

首次登录：`.env` 设 `MINDSPIDER_HEADLESS=false`，提交一次爬虫任务，在弹出的浏览器里扫码；之后改回 `true`。

### Docker 生产：扫码 vs 日常（必读）

登录态保存在 Docker volume `crawler-browser-data`（`browser_data`），**与镜像重建无关**。两种启动方式只差「能不能看见浏览器扫码」：

| 对比项 | 扫码模式（首次 / 登录过期） | 日常爬取 |
|--------|---------------------------|----------|
| 命令 | `docker-compose -f docker-compose.yml -f docker-compose.qr.yml up -d` | `docker-compose up -d` |
| 浏览器 | 有界面（`MINDSPIDER_HEADLESS=false`） | 无头（默认） |
| VNC | 映射 **6080**，打开桌面扫码 | 不开放 6080 |
| 用途 | 写登录态到 volume | 复用已有登录态爬数据 |

**推荐流程：**

```bash
# 1）首次或登录失效：开扫码模式
docker-compose -f docker-compose.yml -f docker-compose.qr.yml up -d

# 2）浏览器打开（用服务器公网 IP，不要用站点域名）
#    http://服务器公网IP:6080/vnc.html  → Connect
#    在网站里用 MindSpider 提交一次爬取，VNC 桌面里出现登录窗 → 手机扫码

# 3）扫码成功、能返回数据后，切回日常（不要再带 qr 文件）
docker-compose up -d
```

说明：

- 域名下的 `/vnc.html` 一般打不开：Nginx 通常只反代 3100，扫码请用 `http://公网IP:6080/vnc.html`
- **禁止** `docker-compose down -v`（会清空登录态和分析库）
- 若报 Chromium `profile appears to be in use`：`docker-compose restart` 后重试（或删 `browser_data` 下的 `SingletonLock`，勿删整个目录）

## 📦 技术栈

| 层面 | 技术 |
|------|------|
| 前端 | React 18 + Vite 5 |
| 图表 | ECharts 5 |
| 导出 | 交互式 HTML（自包含，内嵌 ECharts） |
| 后端 | Express 4（Node.js ≥ 22.5，使用内置 `node:sqlite`） |
| 账号 | scrypt 密码哈希 + HS256 JWT（零外部依赖） |
| 数据源 | Bocha / Anspire / 天行热搜 / MindSpider（Playwright + MediaCrawler） |
| LLM | OpenAI Chat Completions 兼容（DeepSeek / GLM / Qwen / Kimi / MiniMax…） |

## 🚢 部署

### 本机 / 简单上线（无爬虫 Docker）

```bash
npm run build
node server/index.js          # 托管 dist/，默认 :3100
```

- Render：仓库自带 `render.yaml`
- 生产：改随机 `JWT_SECRET`；Node ≥ 22.5；HTTPS 反代 `/api`

### Docker 生产部署（推荐，含 MindSpider）

镜像分两层，**日常更新只重建应用层**，Chromium / Python / MediaCrawler 在底座里：

| 镜像 | 何时构建 | 内容 |
|------|----------|------|
| `agentmind-crawler-base:latest` | 首次上机，或爬虫依赖变更时 | Python venv、Playwright Chromium、MediaCrawler、xvfb/noVNC |
| `agentmind:latest` | 每次 `git pull` 发版 | Node 应用 + 前端 `dist` |

**首次上服务器：**

```bash
# 1. 准备 .env（含 LLM、搜索、JWT_SECRET、MINDSPIDER_ENABLED=true）
cp .env.example .env && vim .env

# 2. 构建底座（较慢，一般只做一次）
docker build -f Dockerfile.base -t agentmind-crawler-base:latest .

# 3. 构建并启动应用
docker-compose build
docker-compose up -d

# 4. 按上一节「扫码模式」完成平台登录，再切回日常
docker-compose -f docker-compose.yml -f docker-compose.qr.yml up -d
# …扫码成功后…
docker-compose up -d
```

**日常发版（不会丢登录态）：**

```bash
git pull
docker-compose down          # 不要加 -v
docker-compose build --no-cache
docker-compose up -d
```

持久化 volume（重建镜像也保留）：

| Volume | 内容 |
|--------|------|
| `agentmind-data` | 账号、分析记录（SQLite） |
| `crawler-browser-data` | 平台登录态（扫码结果） |
| `crawler-user-data` / `crawler-data` | 爬虫辅助数据与 JSON 输出 |

防火墙需放行：`3100`（站点）、扫码时临时放行 `6080`（noVNC）。

### 爬虫架构示意

```
浏览器用户 ──► Node（:3100）── POST /api/crawl/job
                  │
                  ▼
             单工任务队列
                  ▼
         Python 桥接 → Chromium（无头 / 扫码时有界面+VNC）
                  ▼
         browser_data volume（登录态，须持久化）
```

---

## 🔐 安全说明

- 所有密钥仅存于后端 `.env`，浏览器与打包产物不含任何密钥
- LLM 与采集请求均由后端代理转发，前端只与本地 `/api` 通信
- 账号密码 scrypt 加盐哈希存储；分析记录按用户隔离

## 📁 项目结构（开发者）

```
server/                  # Node 后端：API 代理 + 账号 + 记录 + 爬虫队列 + 爬虫桥
├── index.js             # 路由：/api/collect /api/llm /api/auth /api/records /api/crawl …
├── auth.js              # scrypt + JWT + requireAuth
├── db.js                # node:sqlite（users / records 表，含步骤态与流水线快照）
├── crawlQueue.js         # 爬虫后台任务队列（单工，生产「无感」爬取）
├── bocha.js anspire.js hotlist.js   # 搜索/热搜封装
└── mindspider.js + mindspider_bridge.py  # MindSpider 爬虫桥（Node ↔ Python）
mindspider/              # 自带 Python 爬虫组件（MediaCrawler 子模块）
src/
├── App.jsx              # 路由守卫 + 对话式工作台（左右布局）
├── agents/              # 六智能体（采集/清洗/分析/洞察/论坛/报告）
├── services/            # 编排调度（断点续跑）+ LLM/采集/账号 API + 离线演示
├── landing/             # 产品落地页（Navbar/Hero/Features/Pipeline/Scenarios/CTA/Footer）
├── workbench/           # 对话式工作台（侧栏/顶栏/消息流/输入区/热搜空态）
├── components/          # 共享组件（LoginModal / agentDetail / ChartPanel / ReportPanel）
├── report/              # 4 套报告模板 + IR 中间表示
└── utils/               # NLP 解析 / 趋势推演 / 本地情感词典 / 流程产物导出 / HTML 导出
```

---

