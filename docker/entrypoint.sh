#!/bin/bash
set -euo pipefail

HEADLESS="${MINDSPIDER_HEADLESS:-true}"
HEADLESS_LC="$(echo "$HEADLESS" | tr '[:upper:]' '[:lower:]')"

mkdir -p \
  /app/server/data \
  /app/mindspider/DeepSentimentCrawling/MediaCrawler/browser_data \
  /app/mindspider/DeepSentimentCrawling/MediaCrawler/user_data

# 容器重启后清掉 Chromium profile 锁（上次异常退出会残留 SingletonLock）
BROWSER_DATA="/app/mindspider/DeepSentimentCrawling/MediaCrawler/browser_data"
if [ -d "$BROWSER_DATA" ]; then
  find "$BROWSER_DATA" -maxdepth 2 \( \
    -name 'SingletonLock' -o \
    -name 'SingletonCookie' -o \
    -name 'SingletonSocket' -o \
    -name 'DevToolsActivePort' -o \
    -name 'lockfile' \
  \) -delete 2>/dev/null || true
fi

# 首次扫码：虚拟显示器 + noVNC（浏览器打开 http://服务器:6080）
if [ "$HEADLESS_LC" = "false" ] || [ "$HEADLESS_LC" = "0" ] || [ "$HEADLESS_LC" = "no" ]; then
  echo "[entrypoint] QR login mode: Xvfb + noVNC on :6080"
  Xvfb :99 -screen 0 1280x800x24 -ac +extension GLX +render -noreset >/tmp/xvfb.log 2>&1 &
  export DISPLAY=:99
  sleep 1
  x11vnc -display :99 -forever -shared -nopw -listen 0.0.0.0 -rfbport 5900 >/tmp/x11vnc.log 2>&1 &
  if [ -d /usr/share/novnc ]; then
    websockify --web=/usr/share/novnc/ 6080 localhost:5900 >/tmp/novnc.log 2>&1 &
  fi
fi

exec node server/index.js
