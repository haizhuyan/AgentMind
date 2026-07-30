# ---- Stage 1: 构建前端 ----
FROM node:18-alpine AS builder

WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY package.json package-lock.json* ./
RUN npm ci

# 复制源码并构建
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# ---- Stage 2: 生产运行 ----
FROM node:18-alpine

WORKDIR /app

# 仅安装后端运行时所需的依赖（express / cors / dotenv）
COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

# 复制后端源码
COPY server/ ./server/

# 从构建阶段复制前端产物
COPY --from=builder /app/dist ./dist

# 运行时端口（可通过 PORT 或 SERVER_PORT 环境变量覆盖）
EXPOSE 3100

# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3100/api/health',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "server/index.js"]
