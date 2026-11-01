import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { AdminMe, TelegramAuthData } from '@vpnhub/shared'
import { authToken, isTelegram, setUnauthorizedHandler } from '../api/http'
import { queryClient, useAdminMe } from '../api/queries'
import { ErrorView } from '../components/ui'

/*
 * Вход в панель — тот же, что в кабинете: Telegram Login Widget → POST /auth/telegram → токен.
 * Права проверяет GET /admin/me: USER получает 403 и видит экран «Нет доступа».
 * Внутри Telegram (панель открыта как Mini App) запросы несут initData, токен не нужен.
 */

/** Имя и аватар для шапки — из Telegram, в базе этих полей нет */
export interface Profile {
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

const PROFILE_KEY = 'vpnhub.admin.profile'

function readProfile(): Profile | null {
  const tgUser = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: Profile } } } }).Telegram?.WebApp
    ?.initDataUnsafe?.user
  if (isTelegram && tgUser) return tgUser
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as Profile | null
  } catch {
    return null
  }
}

function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
    else localStorage.removeItem(PROFILE_KEY)
  } catch {
    /* хранилище недоступно */
  }
}

interface AuthState {
  isAuthed: boolean
  me: AdminMe | undefined
  profile: Profile | null
  /** Может менять данные: балансы, платёжные системы, настройки. Поддержка — только смотрит. */
  canEdit: boolean
  login(token: string, user: TelegramAuthData): void
  logout(): void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(authToken.get)
  const [profile, setProfile] = useState(readProfile)
  const isAuthed = isTelegram || !!token
  const me = useAdminMe(isAuthed)

  const logout = useCallback(() => {
    authToken.set(null)
    saveProfile(null)
    setToken(null)
    setProfile(null)
    queryClient.clear()
  }, [])

  const login = useCallback((t: string, user: TelegramAuthData) => {
    const p: Profile = { first_name: user.first_name, last_name: user.last_name, username: user.username, photo_url: user.photo_url }
    authToken.set(t)
    saveProfile(p)
    setProfile(p)
    setToken(t)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo<AuthState>(
    () => ({
      isAuthed,
      me: me.data,
      profile,
      canEdit: me.data?.role === 'OWNER' || me.data?.role === 'ADMIN',
      login,
      logout,
    }),
    [isAuthed, me.data, profile, login, logout],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

/**
 * Пускает дальше только сотрудников. Пока /admin/me грузится — пустой экран со спиннером,
 * чтобы не мелькала панель у тех, кому туда нельзя.
 */
export function RequireAdmin({ children, denied }: { children: ReactNode; denied: ReactNode }) {
  const { isAuthed } = useAuth()
  const location = useLocation()
  const me = useAdminMe(isAuthed)

  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (me.isPending)
    return (
      <div className="login" aria-busy>
        <span className="spinner" />
      </div>
    )
  const status = (me.error as { status?: number } | null)?.status
  if (status === 403 || me.data?.role === 'USER') return denied
  if (me.isError)
    return (
      <div className="login">
        <ErrorView error={me.error} onRetry={() => me.refetch()} />
      </div>
    )
  return children
}
