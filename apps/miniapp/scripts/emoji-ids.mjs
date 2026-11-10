// Заполняет packages/shared/src/customEmojiIds.ts: custom_emoji_id каждого эмодзи паков -> имя файла в public/emoji.
// Файлы паков (VHubProject_00, toxicemojismini_00, ...) пронумерованы в порядке стикеров в паке,
// поэтому i-й стикер набора = файл с номером i.
//
// Запуск из корня репозитория:  BOT_TOKEN=123:abc node apps/miniapp/scripts/emoji-ids.mjs
// (в PowerShell: $env:BOT_TOKEN='123:abc'; node apps/miniapp/scripts/emoji-ids.mjs)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const token = process.env.BOT_TOKEN
if (!token) {
  console.error('Нужен BOT_TOKEN - токен любого бота, им только читается публичный набор эмодзи')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const manifest = JSON.parse(readFileSync(join(root, 'apps/miniapp/emoji-src/manifest.json'), 'utf8'))
const out = join(root, 'packages/shared/src/customEmojiIds.ts')

const map = {}
for (const [pack, files] of Object.entries(manifest)) {
  const r = await fetch(`https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(pack)}`)
  const json = await r.json()
  if (!json.ok) {
    console.error(`${pack}: ${json.description}`)
    continue
  }
  json.result.stickers.forEach((s, i) => {
    const file = files[i]?.file?.replace(/\.json$/, '')
    if (s.custom_emoji_id && file) map[s.custom_emoji_id] = file
  })
  console.log(`${pack}: ${json.result.stickers.length} эмодзи`)
}

const src = readFileSync(out, 'utf8')
const head = src.slice(0, src.indexOf('export const CUSTOM_EMOJI_IDS'))
const body = Object.entries(map)
  .map(([id, file]) => `  '${id}': '${file}',`)
  .join('\n')
writeFileSync(out, `${head}export const CUSTOM_EMOJI_IDS: Record<string, string> = {\n${body}\n}\n`)
console.log(`Записано ${Object.keys(map).length} ID в ${out}`)
