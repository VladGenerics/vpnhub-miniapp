/* Варианты цветовой палитры (демо для выбора заказчиком). */

/* emoji — папка с эмодзи: голубые (перекрашенные) или оригинальные зелёные из пака */
export const PALETTES = [
  { id: 'graphite', title: 'Графит', swatch: ['#0e0f11', '#3d9bff'], emoji: 'emoji' },
  { id: 'telegram', title: 'Telegram', swatch: ['#17212b', '#2aabee'], emoji: 'emoji' },
  { id: 'neon', title: 'Неон', swatch: ['#0b100a', '#55fe09'], emoji: 'emoji-original' },
] as const

export type PaletteId = (typeof PALETTES)[number]['id']

export const emojiFolder = (id: PaletteId) => PALETTES.find((p) => p.id === id)!.emoji

const KEY = 'vpnhub.palette'
const ALIASES: Record<string, PaletteId> = { aqua: 'neon' } // старые ссылки ?palette=aqua
const isPalette = (v: unknown): v is PaletteId => PALETTES.some((p) => p.id === v)

export function initialPalette(): PaletteId {
  const raw = new URLSearchParams(location.search).get('palette')
  const fromUrl = raw ? (ALIASES[raw] ?? raw) : null
  if (isPalette(fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(KEY)
    if (isPalette(saved)) return saved
  } catch {
    /* хранилище недоступно */
  }
  return 'graphite'
}

export function applyPalette(id: PaletteId, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('palette-transition')
    setTimeout(() => root.classList.remove('palette-transition'), 500)
  }
  root.dataset.palette = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* хранилище недоступно */
  }
}

/** Текущий цвет фона — для шапки и нижней панели Telegram */
export const currentBg = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
