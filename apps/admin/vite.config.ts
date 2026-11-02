import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // VITE_BASE_PATH=/admin/ — если панель живёт на домене кабинета (вход через Telegram привязан к одному домену)
    base: basePath(env.VITE_BASE_PATH),
    plugins: [react()],
    server: {
      // 5173 занят кабинетом
      port: 5174,
      // API_PROXY=http://localhost:8000 — локально проксировать /api на свой бэкенд, без CORS
      proxy: env.API_PROXY ? { '/api': { target: env.API_PROXY, changeOrigin: true } } : undefined,
    },
    build: {
      // ECharts (~570 КБ) грузится только в статистике, в первый экран не входит
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          // библиотеки отдельными файлами: меняются редко и остаются в кэше между релизами
          codeSplitting: {
            groups: [
              { name: 'echarts', test: /node_modules[\\/](echarts|zrender)[\\/]/ },
              { name: 'vendor', test: /node_modules[\\/]/ },
            ],
          },
        },
      },
    },
  }
})

/** «admin» → «/admin/»: путь всегда со слэшами по краям */
function basePath(v?: string) {
  const p = (v ?? '').trim().replace(/^\/+|\/+$/g, '')
  return p ? `/${p}/` : '/'
}
