import { cpSync, existsSync, readFileSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// эмодзи берём из кабинета: в dev отдаём из apps/miniapp/public, при сборке копируем в dist
const EMOJI_DIRS = ['emoji', 'emoji-fixed']
function miniappEmoji(): Plugin {
  const src = resolve(__dirname, '../miniapp/public')
  let base = '/'
  let outDir = 'dist'
  return {
    name: 'miniapp-emoji',
    configResolved: (c) => void ((base = c.base), (outDir = resolve(c.root, c.build.outDir))),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0])
        if (!url.startsWith(base)) return next()
        const rel = normalize(url.slice(base.length))
        const dir = rel.split(/[\\/]/)[0]
        if (!EMOJI_DIRS.includes(dir) || !rel.endsWith('.lottie')) return next()
        const file = join(src, rel)
        if (!file.startsWith(src) || !existsSync(file)) return next()
        res.setHeader('Content-Type', 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      for (const dir of EMOJI_DIRS) cpSync(join(src, dir), join(outDir, dir), { recursive: true })
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // VITE_BASE_PATH=/admin/ - панель на домене кабинета. В dev всегда /admin/ (кабинет проксирует сюда)
    base: command === 'serve' && !env.VITE_BASE_PATH ? '/admin/' : basePath(env.VITE_BASE_PATH),
    plugins: [react(), miniappEmoji()],
    server: {
      // 5173 занят кабинетом
      port: 5174,
      // API_PROXY=http://localhost:8000 - локально проксировать /api на свой бэкенд, без CORS
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
              { name: 'lottie', test: /node_modules[\\/]lottie-web[\\/]/ },
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
