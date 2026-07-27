# AgentMind · AI 多智能体舆情分析系统

前端（React + Vite）+ 轻量 Node 后端的多智能体舆情分析系统。输入一个关键词或一句话需求，
多个 AI 智能体依次协作完成「采集 → 清洗 → 分析 → 洞察 → 辩论 → 报告」，最终输出情感可视化
图表与可导出的交互式舆情分析报告。

> 架构参考自 [BettaFish（666ghj/BettaFish）](https://github.com/666ghj/BettaFish)：
> 以 AI 联网搜索作为真实数据入口，后端代理密钥，报告可溯源、可导出为交互式 HTML。

## ✨ 核心特性

- **多智能体协作**：采集、清洗、分析、洞察、报告 5 个 Agent 流水线执行，实时展示运行状态与动画。
- **多 Agent 辩论/交叉验证**：独立验证 Agent 复核结论，偏差超阈值时二次校准，结论可溯源。
- **真实联网搜索采集**：后端通过 **Bocha 博查 AI 搜索** 按关键词真实检索全网舆情，返回正文摘要与来源链接。
- **密钥安全**：所有密钥仅存于后端 `.env`，浏览器不接触任何密钥（LLM 调用经后端代理）。
- **报告溯源**：报告引用事实处标注 `[n]`，对应可点击的来源列表。
- **交互式 HTML 报告**：一键导出自包含的交互式 HTML（内嵌 ECharts 图表 + 报告正文 + 来源）。
- **数据可视化**：ECharts 情感分布饼图 + 关键词热度 Top10 柱状图，深色科技风。

## 📁 项目结构

```
server/                          # 轻量 Node 后端（密钥安全 + 真实采集）
├── index.js                     # Express 服务：/api/collect、/api/llm、/api/health
└── bocha.js                     # Bocha 博查 AI 搜索封装（参考 BettaFish）
src/
├── config.js                    # 前端配置（仅 API 基址与采集参数，无密钥）
├── agents/                      # 智能体
│   ├── collectAgent.js          # 采集（调用后端 Bocha 搜索）
│   ├── cleanAgent.js            # 清洗
│   ├── analyzeAgent.js          # 分析（情感/关键词/观点）
│   ├── insightAgent.js          # 洞察（趋势/风险/诉求）
│   ├── reportAgent.js           # 报告生成（含来源溯源标注）
│   └── debateService.js         # 多 Agent 辩论/交叉验证
├── services/
│   ├── llmService.js            # 大模型调用（经后端代理）
│   ├── collectService.js        # 采集（调用后端 /api/collect）
│   └── agentOrchestrator.js     # 调度器（含 onStep 回调）
├── utils/
│   ├── nlpParser.js             # 自然语言需求解析
│   ├── trendPredict.js          # 趋势推演/风险预判
│   └── htmlReport.js            # 交互式 HTML 报告生成
└── components/
    ├── InputPanel.jsx           # 输入区（关键词/自然语言）
    ├── AgentFlow.jsx            # 智能体状态展示
    ├── ChartPanel.jsx           # 可视化图表
    └── ReportPanel.jsx          # 报告展示（复制 / 导出 HTML / 来源）
```

## 🚀 快速开始

1. 安装依赖：

   ```bash
   npm install
   ```

2. 配置密钥：复制 [.env.example](.env.example) 为 `.env`，填入你自己的密钥：

   ```bash
   cp .env.example .env
   ```

   - 大模型（后端代理，OpenAI 兼容）：`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`
   - Bocha 博查 AI 搜索（真实采集）：`BOCHA_API_KEY`（申请：https://open.bochaai.com/ ）
   - 后端端口：`SERVER_PORT`（默认 3100）

   > `.env` 已被 `.gitignore` 忽略，不会提交到仓库。所有密钥仅后端可见。

3. 同时启动后端与前端：

   ```bash
   npm run dev:all
   ```

   - 前端：http://localhost:5173
   - 后端：http://localhost:3100

   也可分别启动：`npm run server`（后端）、`npm run dev`（前端）。

## 🔧 数据采集说明（Bocha 博查 AI 搜索）

采集由后端 [server/index.js](server/index.js) 的 `/api/collect` 完成：调用
Bocha AI Search 按关键词真实检索全网网页，提取标题 + 摘要作为舆情文本，
并保留来源链接用于报告溯源。

- 采集条数与时间范围在 [src/config.js](src/config.js) 的 `COLLECT_CONFIG` 调整（`limit` / `freshness`）。
- 需在 `.env` 填写 `BOCHA_API_KEY` 才能采集；未配置时前端会给出明确提示。

> 相比传统新闻分类接口，Bocha AI 搜索支持真正的关键词检索，是本项目"真实功能"的核心数据入口。

## 🔐 安全说明

- 所有密钥仅存于后端 `.env`，浏览器与打包产物中不含任何密钥。
- LLM 与采集请求均由后端代理转发，前端只与本地 `/api` 通信。
- 生产部署时，请将后端独立部署，并通过反向代理暴露 `/api`。
