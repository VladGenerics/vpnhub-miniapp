import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authToken, setUnauthorizedHandler } from '../api/http'
import { queryClient } from '../api/queries'
import { isTelegram, saveWebUser, type TgUser } from '../lib/telegram'

/*
 * Авторизация.
 * В Telegram пользователь авторизован всегда — каждый запрос несёт initData.
 * В браузере нужен токен, который бэкенд выдаёт после входа через Telegram
 * (страница /login). Токен хранится в localStorage.
 */

interface AuthState {
  isAuthed: boolean
  /** user — данные из Telegram Login Widget для шапки профиля в браузере */
  login(token: string, user?: TgUser): void
  logout(): void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(authToken.get)

  const logout = useCallback(() => {
    authToken.set(null)
    saveWebUser(null)
    setToken(null)
    queryClient.clear()
  }, [])

  const login = useCallback((t: string, user?: TgUser) => {
    authToken.set(t)
    if (user) saveWebUser(user)
    setToken(t)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo(() => ({ isAuthed: isTelegram || !!token, login, logout }), [token, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

/** Пускает дальше только авторизованных, остальных — на /login с возвратом обратно */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth()
  const location = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
