# AgentMind · AI 多智能体舆情分析系统

前端（React + Vite）+ 轻量 Node 后端的多智能体舆情分析系统。输入一个关键词、一句话需求或直接粘贴舆情文本，多个 AI 智能体依次协作完成「采集 → 清洗 → 分析 → 洞察 → 论坛协作 → 报告」全自动闭环，最终输出情感可视化图表与可导出/打印的交互式舆情分析报告。

> 架构参考自 [BettaFish（666ghj/BettaFish）](https://github.com/666ghj/BettaFish)：以 AI 联网搜索作为真实数据入口，后端代理密钥，报告可溯源、可导出为交互式 HTML 与 PDF。

## ✨ 核心特性

### 🤖 多智能体流水线
- **6 步协作闭环**：采集 → 清洗 → 分析 → 洞察 → 论坛协作 → 报告，实时展示每步状态与中间产物。
- **多模型协作**：支持配置最多 **12 个 LLM**（OpenAI 兼容接口），分析阶段各模型**并行独立分析后集成**，验证阶段**跨模型交叉复核**。主模型负责清洗 / 洞察 / 报告 / 主持，其余模型参与并行分析与验证。
- **论坛协作 (ForumEngine)**：参考 BettaFish 的 ForumEngine——「主持人」模型引导「验证 Agent」进行**多轮交叉复核**，逐轮收敛情感占比、归纳共识与分歧、提出追问，最终结论完整可溯源。
- **本地情感中间件**：纯 JS 中文情感词典（正/负情感词 + 否定词翻转 + 程度副词加权），**零成本、瞬时**对文本逐条打分，作为「校准锚点」与 LLM 结果按权重融合，提升情感分析的稳健性。

### 🔍 真实数据采集
- **多源聚合**：**Bocha 博查 AI 搜索**（Web Search / AI Search） + **Anspire 安思派 AI 搜索**，双源并行采集 → 合并去重，缓解单一搜索源偏差。
- **粘贴文本模式**：无需搜索 API，直接粘贴舆情文本 / 用户评论 / 社媒讨论即可分析，每行一条更佳。

### 📊 分析与报告
- **三种输入模式**：关键词输入（联网搜索）、自然语言对话（自动解析关键词与维度）、粘贴文本分析。
- **4 套报告模板**：通用舆情分析 / 企业品牌声誉 / 危机公关应对 / 事件舆情复盘，每套预设章节大纲与主题色，引导模型产出结构化报告。
- **报告 IR 化**：Markdown 报告统一解析为 Document IR（中间表示），支持多格式渲染（交互式 HTML / 打印 PDF / 纯文本）。
- **流式报告生成**：通过 SSE 实时回传 token，前端展示 DeepSeek `reasoning_content` 思考过程 + 正文撰写过程。
- **报告溯源**：引用事实处标注 `[n]`，对应可点击的来源列表。

### 📈 数据可视化
- **ECharts 图表**：情感分布饼图 + 关键词热度 Top10 横向柱状图（深色科技风）。
- **趋势推演**：基于情感占比与风险数量的本地风险等级评估（低/中/高），输出情绪走向（向好/平稳/恶化）与预测。

### 📤 多格式导出
- **交互式 HTML**：一键导出自包含的离线 HTML（内嵌 ECharts CDN + 完整样式 + 图表脚本）。
- **PDF 导出**：前端使用 html2pdf.js 直接生成 A4 电子版 PDF 文件并下载（非调用打印机）。
- **复制报告**：一键复制 Markdown 全文。

### 🔥 实时热搜榜
- **天行数据全网热搜**：首页展示实时热搜榜单，点击任一热点一键填入分析。

### 🔐 安全架构
- 所有密钥仅存于后端 `.env`，浏览器与打包产物中不含任何密钥。
- LLM 与采集请求均由后端代理转发，前端只与本地 `/api` 通信。
- 支持 Render 等云平台一键部署（`render.yaml` Blueprint），后端托管前端静态文件（前后端合一）。

## 📁 项目结构

```
server/                              # 轻量 Node 后端（密钥安全 + 真实采集）
├── index.js                         # Express 服务：/api/collect、/api/llm、/api/llm/stream、/api/models、/api/hotlist、/api/health
├── bocha.js                         # Bocha 博查 AI 搜索封装（Web Search + AI Search）
├── anspire.js                       # Anspire 安思派 AI 搜索封装（第二数据源）
└── hotlist.js                       # 天行数据全网热搜榜
src/
├── config.js                        # 前端配置（仅 API 基址与功能开关，无密钥）
├── App.jsx                          # 根组件（多模型选择、模板切换、热搜联动）
├── agents/                          # 智能体
│   ├── collectAgent.js              # 采集 Agent（调用后端多源搜索）
│   ├── cleanAgent.js                # 清洗 Agent（本地预清洗 + 分批 LLM 清洗）
│   ├── analyzeAgent.js              # 分析 Agent（多模型并行集成 + 本地情感校准）
│   ├── insightAgent.js              # 洞察 Agent（趋势 / 风险 / 诉求 / 成因）
│   ├── reportAgent.js               # 报告 Agent（流式生成 + 模板大纲注入）
│   ├── debateService.js             # 单轮交叉验证（兼容旧行为，多模型并行复核）
│   ├── forumService.js              # 多轮论坛协作（ForumEngine，主持人引导收敛）
│   └── forumHost.js                 # 论坛主持人（归纳共识/分歧，驱动下一轮追问）
├── services/
│   ├── llmService.js                # 大模型调用（后端代理，含流式 SSE 客户端）
│   ├── collectService.js            # 采集服务（/api/collect 代理）
│   ├── hotlistService.js            # 热搜服务（/api/hotlist 代理）
│   └── agentOrchestrator.js         # 智能体调度器（流水线编排 + onStep/onReport 回调）
├── utils/
│   ├── nlpParser.js                 # 自然语言需求解析（关键词 + 维度提取）
│   ├── trendPredict.js              # 趋势推演 / 风险等级评估（本地计算）
│   ├── localSentiment.js            # 本地中文情感分析中间件（词典法）
│   ├── htmlReport.js                # 交互式 HTML + 打印视图生成
│   └── pdfExport.js                 # 前端 PDF 导出（html2pdf.js）
├── report/
│   ├── templates.js                 # 报告模板库（通用 / 品牌 / 危机 / 复盘）
│   └── ir.js                        # 报告 IR 中间表示（解析 / 校验 / 渲染）
└── components/
    ├── InputPanel.jsx               # 输入区（三模式 + 模型选择 + 模板切换）
    ├── AgentFlow.jsx                # 智能体运行状态 + 中间产物可展开查看
    ├── ChartPanel.jsx               # 可视化图表（情感饼图 + 关键词柱状图）
    ├── ReportPanel.jsx              # 报告展示（Markdown 渲染 + 导出 + 溯源）
    └── HotList.jsx                  # 实时热搜榜组件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置密钥

复制 `.env.example` 为 `.env`，填入你自己的密钥：

```bash
cp .env.example .env
```

**必填项**（至少配置一个 LLM + 一个搜索源）：

| 配置 | 说明 |
|------|------|
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | 大模型 API（OpenAI Chat Completions 兼容），必填 |
| `BOCHA_API_KEY` | Bocha 博查 AI 搜索密钥（[申请](https://open.bochaai.com/)） |
| `ANSPIRE_API_KEY` | Anspire 安思派 AI 搜索密钥（与 Bocha 至少配一个） |

**可选项**：

| 配置 | 说明 |
|------|------|
| `LLM2_*` ~ `LLM12_*` | 额外模型槽位，配置 2 个以上时启用多模型并行分析 + 跨模型验证 |
| `LLM_PRIMARY` | 指定主模型槽位 id（如 `llm4`），负责清洗/洞察/报告/主持 |
| `LLM_TIMEOUT` | LLM 单次调用超时毫秒数（默认 100000） |
| `BOCHA_MODE` | `web`（Web Search，默认，便宜够用）或 `ai`（AI Search，带总结） |
| `ANSPIRE_REGION_MODE` | `0` 国内 / `1` 海外 / `2` 混合（默认 0） |
| `TIANAPI_KEY` | 天行数据全网热搜密钥（[申请](https://www.tianapi.com/)） |
| `SERVER_PORT` | 后端端口（默认 3100） |

> `.env` 已被 `.gitignore` 忽略，不会提交到仓库。所有密钥仅后端可见。

### 3. 启动

同时启动后端与前端（推荐）：

```bash
npm run dev:all
```

- 前端：http://localhost:5173
- 后端：http://localhost:3100

也可分别启动：

```bash
npm run server  # 仅后端
npm run dev     # 仅前端（需后端已运行）
```

### 4. 构建与部署

```bash
npm run build   # Vite 构建到 dist/
npm run preview # 预览构建结果
```

后端自动托管 `dist/` 静态文件并处理 SPA 路由兜底，单个 `node server/index.js` 即可上线。Render 用户可直接使用 Blueprint 部署（见 `render.yaml`）。

## 🔧 使用方式

### 三种输入模式

| 模式 | 说明 | 数据来源 |
|------|------|----------|
| **关键词输入** | 输入 1-20 字关键词 | 后端多源联网搜索（Bocha + Anspire） |
| **自然语言对话** | 一句话描述需求，自动解析关键词与分析维度 | 同上 |
| **粘贴文本** | 直接粘贴舆情文本、评论、社媒讨论 | 不依赖任何搜索 API |

### 多模型协作

配置 2+ 个 LLM 模型后：
- 前端展示模型选择器，可勾选参与协作的模型；
- 分析阶段所有选中模型并行独立分析，结果集成（情感取均值、关键词取最大权重、观点去重合并）；
- 验证阶段优先用非主模型做跨模型复核（论坛协作模式可获得更稳健的结论）。

### 报告模板

4 套模板可在输入区切换，每套有独立的章节大纲与主题色：

| 模板 | 适用场景 |
|------|----------|
| 通用舆情分析报告 | 大多数关键词的标准分析 |
| 企业品牌声誉分析报告 | 品牌健康度评估 |
| 危机公关应对报告 | 突发负面事件的快速研判 |
| 事件舆情复盘报告 | 事件平息后的完整回顾 |

## 🔐 安全说明

- 所有密钥仅存于后端 `.env`，浏览器与打包产物中不含任何密钥。
- LLM 与采集请求均由后端代理转发，前端只与本地 `/api` 通信。
- 开发环境通过 Vite 代理转发 `/api` 到后端，生产环境由后端直接托管前端静态文件。
- 生产部署时，请将后端独立部署，并通过反向代理暴露 `/api`。

## 📦 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 18 + Vite 5 |
| 图表库 | ECharts 5 |
| PDF 导出 | html2pdf.js |
| 后端 | Express 4 (Node.js) |
| LLM 协议 | OpenAI Chat Completions 兼容（支持 DeepSeek / 智谱 GLM / 通义千问 / Kimi / SiliconFlow 等） |
| 数据源 | Bocha 博查 AI 搜索 / Anspire 安思派 AI 搜索 / 天行数据热搜 |
| 部署 | Render Blueprint / 任意 Node.js 环境 |

## 🏗️ 流水线详解

```
用户输入（关键词 / 自然语言 / 粘贴文本）
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ ① 采集   │ →  │ ② 清洗   │ →  │ ③ 分析   │ →  │ ④ 洞察   │ →  │ ⑤ 论坛   │ →  │ ⑥ 报告   │
│ Agent    │    │ Agent    │    │ Agent    │    │ Agent    │    │ 协作     │    │ Agent    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
    │                │               │               │               │               │
    ▼                ▼               ▼               ▼               ▼               ▼
Bocha+Anspire    本地预清洗      多模型并行      趋势/风险/       主持人引导      流式生成
多源聚合         去重/去广告      集成分析        诉求/成因       多轮交叉复核     Markdown报告
                 分批LLM清洗     本地情感校准                     结论收敛         IR化 + 导出
```

每个步骤完成后通过 `onStep` 回调实时更新 UI，前端可展开每一步的**真实中间产物**（采集来源链接、清洗前后对比、各模型分析结果、洞察风险点、论坛发言记录、辩论分歧等），让多智能体协作过程「看得见」。
