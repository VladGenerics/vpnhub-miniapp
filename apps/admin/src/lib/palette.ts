import { useEffect, useSyncExternalStore } from 'react'
import { syncThemeColor } from './theme'

/* Цветовая палитра панели — те же варианты, что в кабинете (apps/miniapp/src/lib/palette.ts).
   Ставит data-palette на <html>, цвета — в styles/admin.css. Выбор хранится в localStorage. */

export const PALETTES = [
  { id: 'graphite', title: 'Графит', swatch: ['#0e0f11', '#3d9bff'] },
  { id: 'telegram', title: 'Telegram', swatch: ['#17212b', '#2aabee'] },
  { id: 'neon', title: 'Неон', swatch: ['#0b100a', '#55fe09'] },
] as const

export type PaletteId = (typeof PALETTES)[number]['id']

const KEY = 'vpnhub.admin.palette'
const listeners = new Set<() => void>()
const isPalette = (v: unknown): v is PaletteId => PALETTES.some((p) => p.id === v)

function read(): PaletteId {
  try {
    const v = localStorage.getItem(KEY)
    return isPalette(v) ? v : 'graphite'
  } catch {
    return 'graphite'
  }
}

let palette: PaletteId = read()

export function setPalette(p: PaletteId) {
  palette = p
  try {
    localStorage.setItem(KEY, p)
  } catch {
    /* хранилище недоступно — палитра просто не запомнится */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const usePalette = () => useSyncExternalStore(subscribe, () => palette)

/** Ставит data-palette на <html>; смена плавная, кроме первой отрисовки */
export function useApplyPalette() {
  const p = usePalette()
  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.palette && root.dataset.palette !== p) {
      root.classList.add('palette-transition')
      setTimeout(() => root.classList.remove('palette-transition'), 400)
    }
    root.dataset.palette = p
    syncThemeColor()
  }, [p])
}
