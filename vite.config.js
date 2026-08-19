import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // 开发代理：前端所有 /api 请求转发到本地 Node 后端（server/index.js）。
    // 后端负责真实舆情采集（Bocha 博查 AI 搜索）与 LLM 代理，密钥仅存于后端。
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
        // 后端未启动时（ECONNREFUSED 等），默认返回空白 500，前端只能看到
        // 笼统的 "Request failed with status code 500"。这里改为返回带
        // error 字段的 JSON，前端可展示明确的中文提示。
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (!res || res.headersSent) return
            res.writeHead(502, {
              'Content-Type': 'application/json; charset=utf-8'
            })
            res.end(
              JSON.stringify({
                error:
                  '后端服务未启动，请先运行 `npm run server`（或直接 `npm run dev:all` 同时启动前后端）。'
              })
            )
          })
        }
      }
    }
  }
})
