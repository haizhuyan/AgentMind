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
        changeOrigin: true
      }
    }
  }
})
