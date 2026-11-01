import { useEffect, useSyncExternalStore } from 'react'

/* Тема панели: авто (как в системе / Telegram), светлая или тёмная. Выбор хранится в localStorage. */

export type ThemeMode = 'auto' | 'light' | 'dark'

const KEY = 'vpnhub.admin.theme'
const listeners = new Set<() => void>()

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

let mode: ThemeMode = read()

export function setThemeMode(m: ThemeMode) {
  mode = m
  try {
    localStorage.setItem(KEY, m)
  } catch {
    /* хранилище недоступно — тема просто не запомнится */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useThemeMode = () => useSyncExternalStore(subscribe, () => mode)

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Ставит data-theme на <html> и следит за системной темой в режиме «авто» */
export function useApplyTheme() {
  const m = useThemeMode()
  useEffect(() => {
    const apply = () => {
      const theme = m === 'auto' ? (systemDark() ? 'dark' : 'light') : m
      document.documentElement.dataset.theme = theme
      syncThemeColor()
    }
    apply()
    if (m !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [m])
}

/** Цвет строки состояния браузера — фон текущей темы и палитры */
export function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (bg) document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg)
}

const observeRoot = (cb: () => void) => {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => obs.disconnect()
}

/** Текущая применённая тема — для графиков, которые рисуются на canvas */
export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(observeRoot, () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
}

/** Текущая тема — графикам, чтобы перечитать цвета фона и сетки */
export function useSkin(): string {
  return useSyncExternalStore(observeRoot, () => document.documentElement.dataset.theme ?? '')
}
