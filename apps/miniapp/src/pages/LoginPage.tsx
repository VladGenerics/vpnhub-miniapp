import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { TelegramAuthData } from '@vpnhub/shared'
import { api, USE_MOCKS } from '../api'
import { useSettings } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/Controls'
import { Lottie } from '../components/Lottie'
import { Segmented } from '../components/Segmented'
import { E } from '../data/emoji'
import { rub } from '../lib/format'
import { BOT_ID, botLink, preloadTelegramLogin, telegramLogin } from '../lib/telegramLogin'
import { haptic } from '../lib/telegram'

type Mode = 'login' | 'register'

const REF_KEY = 'vpnhub.ref'

/** Реферальный код из ?ref=… — запоминаем на время сессии, чтобы пережил переходы */
function useRefCode(): string | null {
  const { search } = useLocation()
  const [ref] = useState(() => {
    const fromUrl = new URLSearchParams(search).get('ref')
    try {
      if (fromUrl) sessionStorage.setItem(REF_KEY, fromUrl)
      return fromUrl ?? sessionStorage.getItem(REF_KEY)
    } catch {
      return fromUrl
    }
  })
  return ref
}

const TelegramPlane = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M20.7 4.3L3.6 10.9c-1.2.5-1.1 1.2-.2 1.5l4.4 1.4 1.7 5.2c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.1-2.1 4.4 3.3c.8.4 1.4.2 1.6-.8l2.9-13.6c.3-1.2-.4-1.7-1.5-1.3zM8.5 13.4l9.3-5.9c.4-.3.8-.1.5.2l-7.6 6.9-.3 3.2-1.9-4.4z"
      fill="currentColor"
    />
  </svg>
)

const PERKS = [
  { emoji: E.rocket, text: 'Быстрый VPN без ограничений по трафику' },
  { emoji: E.phone, text: 'Одна подписка на все устройства' },
  { emoji: E.giftTile, text: 'Бонусы за приглашённых друзей' },
]

export function LoginPage() {
  const { isAuthed, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const ref = useRefCode()
  const [mode, setMode] = useState<Mode>(ref ? 'register' : 'login')
  const { data: settings } = useSettings()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(preloadTelegramLogin, [])

  const auth = useMutation({
    mutationFn: async () => {
      // в демо-режиме без бота окно Telegram не открываем — входим тестовым пользователем
      const data: TelegramAuthData | null =
        USE_MOCKS && !BOT_ID
          ? { id: 5_812_334_097, first_name: 'Демо', last_name: 'Пользователь', username: 'vpnhub_demo', auth_date: Math.floor(Date.now() / 1000), hash: 'mock' }
          : await telegramLogin()
      if (!data) return null
      const res = await api.loginTelegram({ ...data, ref: ref ?? undefined })
      return { ...res, user: data }
    },
    onSuccess: (res) => {
      if (!res) return
      haptic.notify('success')
      try {
        sessionStorage.removeItem(REF_KEY)
      } catch {
        /* хранилище недоступно */
      }
      login(res.token, res.user)
      navigate(from, { replace: true })
    },
  })

  if (isAuthed) return <Navigate to={from} replace />

  const tgLink = botLink(ref ? `ref_${ref}` : undefined)

  return (
    <main className="login">
      <div className="login-glow" aria-hidden />
      <div className="login-card">
        <div className="login-logo">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width={88} height={88} alt="" />
        </div>
        <h1 className="login-title">{mode === 'login' ? 'Вход в VPNHub' : 'Регистрация в VPNHub'}</h1>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Войдите через Telegram, чтобы управлять подпиской с компьютера или телефона'
            : 'Аккаунт создаётся по вашему Telegram — без паролей и почты'}
        </p>

        <Segmented<Mode>
          label="Вход или регистрация"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'login', label: 'Вход' },
            { value: 'register', label: 'Регистрация' },
          ]}
        />

        {mode === 'register' && (
          <ul className="login-perks">
            {PERKS.map((p) => (
              <li key={p.text}>
                <Lottie name={p.emoji} size={30} />
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        )}

        {mode === 'register' && ref && (
          <div className="notice is-accent">
            <Lottie name={E.gift} size={26} />
            <span>
              Вас пригласили — {settings ? `${rub(settings.invited_bonus)} ` : ''}бонусом на баланс после регистрации
            </span>
          </div>
        )}

        <div className="login-actions">
          <Button stretched className="btn-telegram" icon={<TelegramPlane />} onClick={() => auth.mutate()} disabled={auth.isPending}>
            {auth.isPending ? 'Ждём подтверждения…' : mode === 'login' ? 'Войти через Telegram' : 'Зарегистрироваться через Telegram'}
          </Button>
          {tgLink && (
            <a className="btn btn-secondary btn-l is-stretched" href={tgLink} target="_blank" rel="noopener">
              Открыть бота в Telegram
            </a>
          )}
        </div>

        {auth.isError && <p className="login-error">{auth.error.message || 'Не удалось войти, попробуйте ещё раз'}</p>}

        <p className="login-legal">
          {mode === 'login' ? 'Нет аккаунта? Он создастся автоматически при первом входе.' : 'Уже пользовались ботом? Просто войдите — подписка и баланс сохранятся.'}
          {USE_MOCKS && !BOT_ID && <span className="login-demo">Демо-режим: вход выполняется тестовым пользователем</span>}
        </p>
      </div>
    </main>
  )
}
