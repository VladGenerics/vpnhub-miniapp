import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyPalette, initialPalette, type PaletteId } from '../lib/palette'

/*
 * Локальные настройки интерфейса (не данные пользователя — те приходят из API,
 * см. src/api/queries.ts).
 */

/** auto — как в Telegram / системе, иначе принудительно */
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
  themeMode: ThemeMode
  setThemeMode(m: ThemeMode): void
  /** Правая панель на десктопе свёрнута до иконок */
  sidebarCollapsed: boolean
  toggleSidebar(): void
}

const Ctx = createContext<AppState | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const p = initialPalette()
    applyPalette(p)
    return p
  })
  const setPalette = useCallback((id: PaletteId) => {
    applyPalette(id, true)
    setPaletteState(id)
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
    () => ({ palette, setPalette, themeMode, setThemeMode, sidebarCollapsed, toggleSidebar }),
    [palette, setPalette, themeMode, setThemeMode, sidebarCollapsed, toggleSidebar],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp вне AppStoreProvider')
  return v
}
