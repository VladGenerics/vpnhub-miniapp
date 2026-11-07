import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FaTelegramPlane } from 'react-icons/fa'
import { preloadTelegramLogin, telegramLoginPopup, type TelegramAuthData } from '@vpnhub/shared'
import { api, USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthProvider'
import { isTelegram } from '../api/http'
import { Button } from '../components/ui'

const BOT_ID = Number(import.meta.env.VITE_TG_BOT_ID) || 0

export function LoginPage() {
  const { isAuthed, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  // на тестовых данных без бота окно Telegram не открываем
  const mockLogin = USE_MOCKS && !BOT_ID

  useEffect(() => {
    if (BOT_ID) preloadTelegramLogin()
  }, [])

  const auth = useMutation({
    mutationFn: async () => {
      let data: TelegramAuthData | null
      if (mockLogin) {
        data = {
          id: 5_000_000_001,
          first_name: 'Тест',
          last_name: 'Админ',
          username: 'vpnhub_admin',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'mock',
        }
      } else {
        if (!BOT_ID) throw new Error('Вход не настроен: укажите VITE_TG_BOT_ID')
        data = await telegramLoginPopup(BOT_ID)
      }
      if (!data) return null
      const res = await api.loginTelegram(data)
      return { token: res.token, user: data }
    },
    onSuccess: (res) => {
      if (!res) return
      login(res.token, res.user)
      navigate(from, { replace: true })
    },
  })

  if (isAuthed) return <Navigate to={from} replace />

  return (
    <main className="login">
      <div className="card login-card">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        <div>
          <h1>VPNHub Admin</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Вход для сотрудников проекта через Telegram
          </p>
        </div>

        <Button className="btn-telegram" wide loading={auth.isPending} onClick={() => auth.mutate()}>
          {!auth.isPending && <FaTelegramPlane size={20} />}
          Войти через Telegram
        </Button>

        {auth.error && (
          <div className="field-error" role="alert">
            {(auth.error as Error).message}
          </div>
        )}
      </div>
    </main>
  )
}

/** Вошёл, но не сотрудник */
export function NoAccessPage() {
  const { logout, profile } = useAuth()
  return (
    <main className="login">
      <div className="card login-card">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        <div>
          <h1>Нет доступа</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {profile?.username ? `Аккаунт @${profile.username}` : 'Этот аккаунт'} не входит в команду проекта. Доступ выдаёт владелец — ролью администратора или
            поддержки.
          </p>
        </div>
        {/* в Telegram аккаунт задаёт сам Telegram: сменить его можно только там */}
        {isTelegram ? (
          <p className="muted">Чтобы войти другим аккаунтом, откройте админку из Telegram под нужным аккаунтом</p>
        ) : (
          <Button variant="secondary" icon="logout" wide onClick={logout}>
            Войти другим аккаунтом
          </Button>
        )}
      </div>
    </main>
  )
}
