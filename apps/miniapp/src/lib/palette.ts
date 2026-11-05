// Цветовые палитры кабинета, переключаются в «Оформлении» (/ui)

// emoji - папка с эмодзи: голубые (перекрашенные) или оригинальные зелёные. У своего цвета - в цвет акцента (emojiSource)
export const PALETTES = [
  { id: 'graphite', title: 'Графит', swatch: ['#0e0f11', '#3d9bff'], emoji: 'emoji' },
  { id: 'telegram', title: 'Telegram', swatch: ['#17212b', '#2aabee'], emoji: 'emoji' },
  { id: 'neon', title: 'Неон', swatch: ['#0b100a', '#55fe09'], emoji: 'emoji-original' },
] as const

/** custom - свой акцентный цвет на фоне «Графита» */
export type PaletteId = (typeof PALETTES)[number]['id'] | 'custom'

const KEY = 'vpnhub.palette'
const ACCENT_KEY = 'vpnhub.accent'
const ALIASES: Record<string, PaletteId> = { aqua: 'neon' } // старое имя из ранних ссылок
const isPalette = (v: unknown): v is PaletteId => v === 'custom' || PALETTES.some((p) => p.id === v)
export const DEFAULT_ACCENT = '#a35cff'

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* хранилище недоступно */
  }
}

export function initialPalette(): PaletteId {
  const raw = new URLSearchParams(location.search).get('palette')
  const fromUrl = raw ? (ALIASES[raw] ?? raw) : null
  if (isPalette(fromUrl)) return fromUrl
  const saved = read(KEY)
  return isPalette(saved) ? saved : 'graphite'
}

export function initialAccent() {
  const saved = read(ACCENT_KEY)
  return saved && isHex(saved) ? saved.toLowerCase() : DEFAULT_ACCENT
}

/* ---------- цвет: hex <-> hsl, контраст ---------- */

type Hsl = [h: number, s: number, l: number]

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

export function hslToHex([h, s, l]: Hsl) {
  s = Math.min(100, Math.max(0, s)) / 100
  l = Math.min(100, Math.max(0, l)) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return (
    '#' +
    [0, 8, 4]
      .map((n) =>
        Math.round(f(n) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const rgba = (hex: string, alpha: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${alpha})`

/** Сдвигает светлоту, пока цвет не станет читаемым на фоне */
function fitTo(hex: string, bg: string, min: number, step: number) {
  let [h, s, l] = hexToHsl(hex)
  let out = hex
  for (let i = 0; i < 40 && contrast(out, bg) < min; i++) {
    l += step
    out = hslToHex([h, s, l])
  }
  return out
}

/** Набор акцентных токенов из одного цвета, как у готовых палитр */
function accentTokens(hex: string, bg: string, dark: boolean) {
  const accent = fitTo(hex, bg, 3, dark ? 2 : -2)
  const [h, s, l] = hexToHsl(accent)
  const onAccent = contrast('#ffffff', accent) >= 2.6 ? '#ffffff' : '#0c0d10'
  return {
    '--accent': accent,
    '--accent-hover': hslToHex([h, s, l + (dark ? 7 : -6)]),
    '--accent-2': hslToHex([h, s - 10, l + 16]),
    '--accent-deep': hslToHex([h, s, l - 12]),
    '--accent-soft': rgba(accent, dark ? 0.13 : 0.1),
    '--accent-glow': rgba(accent, dark ? 0.22 : 0.18),
    '--accent-ring': rgba(accent, dark ? 0.2 : 0.16),
    '--accent-glow-soft': rgba(accent, dark ? 0.12 : 0.1),
    '--on-accent': onAccent,
  }
}

const block = (sel: string, vars: Record<string, string>) =>
  `${sel}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`

// Стили своей палитры: фон «Графита», акцент из выбранного цвета.
// :root поднимает специфичность над правилами «Графита» в palettes.css
function customCss(hex: string) {
  return [
    block(":root[data-theme='dark'][data-palette='custom']", accentTokens(hex, '#18191c', true)),
    block(":root[data-theme='light'][data-palette='custom']", accentTokens(hex, '#ffffff', false)),
  ].join('\n')
}

/** Зелёный акцент - оригинальные зелёные эмодзи, остальные - перекрашенные */
/**
 * Откуда брать эмодзи. У готовых палитр свой набор, у своего цвета - родные зелёные,
 * которые Lottie перекрашивает в оттенок акцента (tint «оттенок,насыщенность», пусто - как есть).
 * Оттенок шагом 5°, чтобы соседние цвета делили кэш
 */
export function emojiSource(id: PaletteId, accent?: string): { folder: string; tint: string } {
  if (id !== 'custom') return { folder: PALETTES.find((p) => p.id === id)!.emoji, tint: '' }
  const [h, s] = hexToHsl(accent ?? DEFAULT_ACCENT)
  // зелёный акцент - родные эмодзи как есть
  if (s > 25 && h >= 70 && h <= 170) return { folder: 'emoji-original', tint: '' }
  // серый акцент - эмодзи тоже уходят в серый
  return { folder: 'emoji-original', tint: `${(Math.round(h / 5) * 5) % 360},${Math.round(Math.min(1, s / 60) * 10) / 10}` }
}

export function applyPalette(id: PaletteId, accent: string, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('palette-transition')
    setTimeout(() => root.classList.remove('palette-transition'), 500)
  }
  let style = document.getElementById('custom-palette')
  if (id === 'custom') {
    if (!style) {
      style = document.createElement('style')
      style.id = 'custom-palette'
      document.head.append(style)
    }
    style.textContent = customCss(accent)
    write(ACCENT_KEY, accent)
  } else style?.remove()
  root.dataset.palette = id
  write(KEY, id)
}

/** Цвет фона для шапки и нижней панели Telegram */
export const currentBg = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
