import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyPalette, initialAccent, initialPalette, type PaletteId } from '../lib/palette'

// Локальные настройки интерфейса. Данные пользователя приходят из API (src/api/queries.ts).

/** auto - как в Telegram или системе */
export type ThemeMode = 'auto' | 'dark' | 'light'

const THEME_KEY = 'vpnhub.theme'
const SIDEBAR_KEY = 'vpnhub.sidebar'

function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* хранилище недоступно */
  }
}

interface AppState {
  palette: PaletteId
  setPalette(id: PaletteId): void
  /** Свой акцентный цвет (#rrggbb), действует при палитре custom */
  accent: string
  setAccent(hex: string): void
  themeMode: ThemeMode
  setThemeMode(m: ThemeMode): void
  /** Боковая панель на ПК свёрнута до иконок */
  sidebarCollapsed: boolean
  toggleSidebar(): void
}

const Ctx = createContext<AppState | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(initialAccent)
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const p = initialPalette()
    applyPalette(p, accent)
    return p
  })
  const setPalette = useCallback(
    (id: PaletteId) => {
      applyPalette(id, accent, true)
      setPaletteState(id)
    },
    [accent],
  )
  // цвет меняется непрерывно (ползунок), без анимации перехода
  const setAccent = useCallback((hex: string) => {
    applyPalette('custom', hex)
    setPaletteState('custom')
    setAccentState(hex)
  }, [])

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => load(THEME_KEY, ['auto', 'dark', 'light'], 'auto'))
  const setThemeMode = useCallback((m: ThemeMode) => {
    const root = document.documentElement
    root.classList.add('palette-transition')
    setTimeout(() => root.classList.remove('palette-transition'), 500)
    save(THEME_KEY, m)
    setThemeModeState(m)
  }, [])

  const [sidebarCollapsed, setCollapsed] = useState(() => load(SIDEBAR_KEY, ['0', '1'], '0') === '1')
  const toggleSidebar = useCallback(
    () =>
      setCollapsed((v) => {
        save(SIDEBAR_KEY, v ? '0' : '1')
        return !v
      }),
    [],
  )

  const value = useMemo<AppState>(
    () => ({ palette, setPalette, accent, setAccent, themeMode, setThemeMode, sidebarCollapsed, toggleSidebar }),
    [palette, setPalette, accent, setAccent, themeMode, setThemeMode, sidebarCollapsed, toggleSidebar],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp вне AppStoreProvider')
  return v
}
