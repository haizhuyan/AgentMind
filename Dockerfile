# 应用镜像（日常 docker-compose build --no-cache 只重建这一份）
# -------------------------------------------------------
# 已写死在基础镜像 agentmind-crawler-base:latest，禁止再写进本文件：
#   Python venv、pip 包、Playwright Chromium、MediaCrawler 源码、xvfb/noVNC
#
# 第一次上服务器（或底座要升级）先构建底座：
#   docker build -f Dockerfile.base -t agentmind-crawler-base:latest .
#
# 不在镜像里、重建也不会丢（千万不要 docker-compose down -v）：
#   /app/server/data
#   MediaCrawler/browser_data
#   MediaCrawler/user_data

FROM agentmind-crawler-base:latest AS runtime

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM runtime
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/ ./server/
COPY mindspider/ ./mindspider/
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

COPY --from=builder /app/dist ./dist

ENV PORT=3100 \
    MINDSPIDER_PYTHON=/opt/venv/bin/python \
    MINDSPIDER_CDP=true \
    MINDSPIDER_BROWSER=/usr/bin/chromium \
    PYTHONUNBUFFERED=1

EXPOSE 3100 6080
ENTRYPOINT ["/entrypoint.sh"]
