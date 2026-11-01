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
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0e0f11' : '#f3f4f7')
    }
    apply()
    if (m !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [m])
}

/** Текущая применённая тема — для графиков, которые рисуются на canvas */
export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb)
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      return () => obs.disconnect()
    },
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  )
}
