import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          // библиотеки отдельными файлами: меняются редко и остаются в кэше между релизами
          codeSplitting: {
            groups: [
              { name: 'lottie', test: /node_modules[\\/]lottie-web[\\/]/ },
              { name: 'vendor', test: /node_modules[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      // API_PROXY=http://localhost:8000 — локально проксировать /api на свой бэкенд, без CORS
      proxy: env.API_PROXY ? { '/api': { target: env.API_PROXY, changeOrigin: true } } : undefined,
      // туннель cloudflared для проверки внутри Telegram
      allowedHosts: ['.trycloudflare.com'],
    },
    preview: { allowedHosts: ['.trycloudflare.com'] },
  }
})
