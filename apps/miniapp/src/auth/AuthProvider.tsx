import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authToken, setUnauthorizedHandler } from '../api/http'
import { authEpoch, queryClient } from '../api/queries'
import { draft } from '../lib/draft'
import { PageError } from '../components/States'
import { isTelegram, saveWebUser, tg, type TgUser } from '../lib/telegram'

/** Смена аккаунта: старые данные, поздние ответы и черновик покупки прежнего пользователя больше не действуют */
function resetAccountState() {
  authEpoch.value++
  queryClient.clear()
  draft.clear()
}

// В Telegram пользователь авторизован всегда, каждый запрос несёт initData.
// В браузере нужен токен, который бэкенд выдаёт после входа на /login. Храним его в localStorage.

interface AuthState {
  isAuthed: boolean
  /** Telegram отклонил initData (истекла): нужно заново открыть приложение из бота */
  tgExpired: boolean
  /** user - данные из Telegram Login Widget, для шапки профиля в браузере */
  login(token: string, user?: TgUser): void
  logout(): void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(authToken.get)
  const [tgExpired, setTgExpired] = useState(false)

  const logout = useCallback(() => {
    authToken.set(null)
    saveWebUser(null)
    setToken(null)
    resetAccountState()
  }, [])

  const login = useCallback((t: string, user?: TgUser) => {
    authToken.set(t)
    if (user) saveWebUser(user)
    setToken((prev) => {
      if (prev !== t) resetAccountState()
      return t
    })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler((via) => (via === 'telegram' ? setTgExpired(true) : logout()))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // вход или выход в соседней вкладке: берём её токен и сбрасываем кэш, чтобы не показать чужие данные
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== authToken.key && e.key !== null) return
      const next = authToken.get()
      setToken((prev) => {
        if (prev !== next) resetAccountState()
        return next
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ isAuthed: isTelegram || !!token, tgExpired, login, logout }), [token, tgExpired, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

/** Неавторизованных отправляет на /login и потом возвращает обратно */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, tgExpired } = useAuth()
  const location = useLocation()
  if (tgExpired)
    return (
      <main className="page">
        <PageError title="Сессия истекла" text="Закройте приложение и откройте его заново из бота" action="Закрыть" onRetry={() => tg?.close()} />
      </main>
    )
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
