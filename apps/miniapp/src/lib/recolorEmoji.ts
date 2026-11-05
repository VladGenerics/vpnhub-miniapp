// Перекраска родных зелёных эмодзи в оттенок своего цвета: то же, что scripts/recolor-emoji.py,
// только в браузере. Трогаем лишь зелёные цвета, жёлтые, серые и белые части остаются как были.
// Один проход по json анимации, единицы миллисекунд.

type Rgb = [number, number, number]

function rgbToHsl([r, g, b]: Rgb): Rgb {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb([h, s, l]: Rgb): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r + m, g + m, b + m]
}

const isNum = (v: unknown): v is number => typeof v === 'number'

/** hue - оттенок акцента в градусах, sat - доля насыщенности (серый акцент даёт серые эмодзи) */
export function recolorEmoji<T>(data: T, hue: number, sat: number): T {
  const shift = (rgb: Rgb): Rgb => {
    const [h, s, l] = rgbToHsl(rgb)
    if (s < 0.18 || h < 70 || h > 175) return rgb
    // разброс оттенков внутри зелёного сохраняем, как в скрипте
    return hslToRgb([(((hue + (h - 120) * 0.5) % 360) + 360) % 360, s * sat, l])
  }

  const fixColor = (arr: unknown) => {
    if (!Array.isArray(arr) || arr.length < 3 || !arr.slice(0, 3).every(isNum)) return
    const scale = Math.max(arr[0], arr[1], arr[2]) > 1 ? 255 : 1
    const out = shift([arr[0] / scale, arr[1] / scale, arr[2] / scale])
    for (let i = 0; i < 3; i++) arr[i] = out[i] * scale
  }

  // градиент: [offset, r, g, b] на каждую точку, дальше хвост прозрачности - его не трогаем
  const fixGradient = (arr: unknown, stops: number) => {
    if (!Array.isArray(arr)) return
    for (let i = 0; i < Math.min(stops * 4, arr.length - 3); i += 4) {
      const c = arr.slice(i + 1, i + 4)
      if (!c.every((v) => isNum(v) && v >= 0 && v <= 1)) continue
      const out = shift(c as Rgb)
      arr[i + 1] = out[0]
      arr[i + 2] = out[1]
      arr[i + 3] = out[2]
    }
  }

  const walkProp = (prop: unknown, fix: (arr: unknown) => void) => {
    if (!prop || typeof prop !== 'object') return
    const k = (prop as { k?: unknown }).k
    if (Array.isArray(k) && k[0] && typeof k[0] === 'object') {
      // анимированное значение: цвета в ключевых кадрах
      for (const kf of k as { s?: unknown; e?: unknown }[]) {
        if (kf.s) fix(kf.s)
        if (kf.e) fix(kf.e)
      }
    } else fix(k)
  }

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.ty === 'fl' || n.ty === 'st') walkProp(n.c, fixColor)
    if ((n.ty === 'gf' || n.ty === 'gs') && n.g && typeof n.g === 'object') {
      const g = n.g as { p?: number; k?: unknown }
      walkProp(g.k, (arr) => fixGradient(arr, g.p ?? 0))
    }
    // слой-заливка цветом: sc = '#rrggbb'
    if (typeof n.sc === 'string' && /^#[0-9a-f]{6}$/i.test(n.sc)) {
      const rgb = [1, 3, 5].map((i) => parseInt((n.sc as string).slice(i, i + 2), 16) / 255) as Rgb
      n.sc =
        '#' +
        shift(rgb)
          .map((v) =>
            Math.round(v * 255)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')
    }
    for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v)
  }

  walk(data)
  return data
}
