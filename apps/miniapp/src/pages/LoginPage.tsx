import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { TelegramAuthData } from '@vpnhub/shared'
import { FaTelegramPlane } from 'react-icons/fa'
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

/** Реферальный код из ?ref=..., держим его в sessionStorage, чтобы пережил переходы.
 *  По ссылке /?ref=... гость сначала попадает на защищённую страницу, и та уводит на вход,
 *  сохранив исходный адрес в state.from - код ищем и там */
function useRefCode(): string | null {
  const { search, state } = useLocation()
  const [ref] = useState(() => {
    const from = (state as { from?: string } | null)?.from
    const fromUrl = new URLSearchParams(search).get('ref') ?? (from ? new URL(from, location.origin).searchParams.get('ref') : null)
    try {
      if (fromUrl) sessionStorage.setItem(REF_KEY, fromUrl)
      return fromUrl ?? sessionStorage.getItem(REF_KEY)
    } catch {
      return fromUrl
    }
  })
  return ref
}

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
  // бонус нужен только в тексте про приглашение
  const { data: settings } = useSettings(!!ref)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(preloadTelegramLogin, [])

  const auth = useMutation({
    mutationFn: async () => {
      // на тестовых данных без бота окно Telegram не открываем, входим тестовым пользователем
      const data: TelegramAuthData | null =
        USE_MOCKS && !BOT_ID
          ? {
              id: 5_812_334_097,
              first_name: 'Тест',
              last_name: 'Пользователь',
              username: 'vpnhub_test',
              auth_date: Math.floor(Date.now() / 1000),
              hash: 'mock',
            }
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
            <span>Вас пригласили — {settings ? `${rub(settings.invited_bonus)} ` : ''}бонусом на баланс после регистрации</span>
          </div>
        )}

        <div className="login-actions">
          <Button stretched className="btn-telegram" icon={<FaTelegramPlane size={22} />} onClick={() => auth.mutate()} disabled={auth.isPending}>
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
          {mode === 'login'
            ? 'Нет аккаунта? Он создастся автоматически при первом входе.'
            : 'Уже пользовались ботом? Просто войдите — подписка и баланс сохранятся.'}
        </p>
      </div>
    </main>
  )
}
