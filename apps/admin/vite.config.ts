import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // VITE_BASE_PATH=/admin/ — панель на том же домене, что и кабинет (Telegram Login
  // привязывается к одному домену на бота). По умолчанию — корень своего домена.
  base: basePath(loadEnv(mode, process.cwd(), '').VITE_BASE_PATH),
  plugins: [react()],
  // кабинет занимает 5173 — админке свой порт, чтобы оба запускались одновременно
  server: { port: 5174 },
  build: {
    // ECharts (~570 КБ, 190 КБ gzip) грузится только на страницах статистики, в первый экран не входит
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // библиотеки — отдельными файлами: они меняются реже кода и остаются в кэше браузера между релизами
        codeSplitting: {
          groups: [
            { name: 'echarts', test: /node_modules[\\/](echarts|zrender)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
}))

/** «admin» → «/admin/»: путь всегда со слэшами по краям */
function basePath(v?: string) {
  const p = (v ?? '').trim().replace(/^\/+|\/+$/g, '')
  return p ? `/${p}/` : '/'
}
