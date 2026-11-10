import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// В public лежат все эмодзи паков (их смотрит витрина /emoji в dev), в сборку оставляем только те,
// что есть в src/data/emoji.ts. Имена там собираются через V(n) и T(n).
// Сборка с тестовыми данными (keepAll) оставляет все: в панели состояний эмодзи подсказки выбирают из всего списка.
function pruneEmoji(keepAll: boolean): Plugin {
  let outDir = 'dist'
  let root = '.'
  return {
    name: 'prune-emoji',
    apply: 'build',
    configResolved: (c) => void ((outDir = c.build.outDir), (root = c.root)),
    closeBundle() {
      if (keepAll) return
      const src = readFileSync(join(root, 'src/data/emoji.ts'), 'utf8')
      const pad = (n: string) => n.padStart(2, '0')
      const used = new Set([
        ...[...src.matchAll(/\bV\((\d+)\)/g)].map((m) => `VHubProject_${pad(m[1])}.lottie`),
        ...[...src.matchAll(/\bT\((\d+)\)/g)].map((m) => `toxicemojismini_${pad(m[1])}.lottie`),
      ])
      if (used.size < 10) throw new Error('prune-emoji: не нашёл эмодзи в src/data/emoji.ts, формат поменялся?')
      for (const dir of ['emoji', 'emoji-original']) {
        const path = join(outDir, dir)
        for (const f of readdirSync(path)) if (!used.has(f)) rmSync(join(path, f))
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // версия для строки в профиле - из package.json, чтобы не править её руками при релизе
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
  return {
    // эмодзи разделов выбирают в админке из всех паков (и по custom_emoji_id), поэтому в сборке остаются все файлы.
    // Грузятся они по требованию, место занимают только на сервере. PRUNE_EMOJI=true - вернуть обрезку
    plugins: [react(), pruneEmoji(env.PRUNE_EMOJI !== 'true')],
    define: { __APP_VERSION__: JSON.stringify(version) },
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
      // API_PROXY=http://localhost:8000 - локально проксировать /api на свой бэкенд, без CORS
      proxy: {
        ...(env.API_PROXY ? { '/api': { target: env.API_PROXY, changeOrigin: true } } : {}),
        // админка (npm run dev:admin) на том же адресе: localhost:5173/admin/. На тестовых данных общий localStorage,
        // поэтому разделы, добавленные в админке, сразу видны в кабинете
        '/admin': { target: 'http://localhost:5174', ws: true },
      },
      // туннель cloudflared для проверки внутри Telegram
      allowedHosts: ['.trycloudflare.com'],
    },
    preview: { allowedHosts: ['.trycloudflare.com'] },
  }
})
