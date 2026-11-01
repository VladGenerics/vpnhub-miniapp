import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { preloadTelegramLogin, ROLE_LABEL, telegramLoginPopup, type TelegramAuthData, type UserRole } from '@vpnhub/shared'
import { api, DEMO_ROLE_KEY, USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthProvider'
import { Segmented } from '../components/Segmented'
import { Button } from '../components/ui'

const BOT_ID = Number(import.meta.env.VITE_TG_BOT_ID) || 0

const TelegramPlane = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M20.7 4.3L3.6 10.9c-1.2.5-1.1 1.2-.2 1.5l4.4 1.4 1.7 5.2c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.1-2.1 4.4 3.3c.8.4 1.4.2 1.6-.8l2.9-13.6c.3-1.2-.4-1.7-1.5-1.3zM8.5 13.4l9.3-5.9c.4-.3.8-.1.5.2l-7.6 6.9-.3 3.2-1.9-4.4z"
      fill="currentColor"
    />
  </svg>
)

type DemoRole = Extract<UserRole, 'OWNER' | 'ADMIN' | 'SUPPORT_AGENT'>
const DEMO_ROLES: { value: DemoRole; label: string }[] = [
  { value: 'OWNER', label: ROLE_LABEL.OWNER },
  { value: 'ADMIN', label: 'Админ' },
  { value: 'SUPPORT_AGENT', label: ROLE_LABEL.SUPPORT_AGENT },
]

export function LoginPage() {
  const { isAuthed, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const demo = USE_MOCKS && !BOT_ID
  const [role, setRole] = useState<DemoRole>('OWNER')

  useEffect(() => {
    if (BOT_ID) preloadTelegramLogin()
  }, [])

  const auth = useMutation({
    mutationFn: async () => {
      let data: TelegramAuthData | null
      if (demo) {
        try {
          localStorage.setItem(DEMO_ROLE_KEY, role)
        } catch {
          /* без хранилища демо войдёт владельцем */
        }
        data = { id: 5_000_000_001, first_name: 'Демо', last_name: ROLE_LABEL[role], username: 'vpnhub_admin', auth_date: Math.floor(Date.now() / 1000), hash: 'mock' }
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

        {demo && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="notice is-accent" style={{ textAlign: 'left' }}>
              Демо-режим: данные сгенерированы, изменения живут до перезагрузки страницы. Выберите роль, чтобы посмотреть права.
            </div>
            <Segmented<DemoRole> options={DEMO_ROLES} value={role} onChange={setRole} label="Роль демо-входа" />
          </div>
        )}

        <Button className="btn-telegram" wide loading={auth.isPending} onClick={() => auth.mutate()}>
          {!auth.isPending && <TelegramPlane />}
          {demo ? 'Войти в демо' : 'Войти через Telegram'}
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

/** Вошёл, но не сотрудник (или роль USER) */
export function NoAccessPage() {
  const { logout, profile } = useAuth()
  return (
    <main className="login">
      <div className="card login-card">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        <div>
          <h1>Нет доступа</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {profile?.username ? `Аккаунт @${profile.username}` : 'Этот аккаунт'} не входит в команду проекта. Доступ выдаёт владелец — ролью
            администратора или поддержки.
          </p>
        </div>
        <Button variant="secondary" icon="logout" wide onClick={logout}>
          Войти другим аккаунтом
        </Button>
      </div>
    </main>
  )
}
