import type { TelegramAuthData } from './types'

// Вход через Telegram на сайте (Login Widget во всплывающем окне).
// Нужен числовой id бота и домен, привязанный к боту в @BotFather → /setdomain.

interface TgLogin {
  auth(opts: { bot_id: number; request_access?: 'write'; lang?: string }, cb: (data: TelegramAuthData | false) => void): void
}

const SCRIPT = 'https://telegram.org/js/telegram-widget.js?22'
let loading: Promise<TgLogin> | null = null

function loadWidget(): Promise<TgLogin> {
  const get = () => (window as unknown as { Telegram?: { Login?: TgLogin } }).Telegram?.Login
  if (get()) return Promise.resolve(get()!)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (get() ? resolve(get()!) : reject(new Error('Telegram Login недоступен')))
    s.onerror = () => {
      loading = null
      reject(new Error('Не удалось загрузить Telegram Login'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** Заранее подгрузить скрипт, чтобы окно открылось сразу по клику */
export function preloadTelegramLogin() {
  loadWidget().catch(() => {})
}

/** Открывает окно входа Telegram. null - окно закрыли */
export async function telegramLoginPopup(botId: number): Promise<TelegramAuthData | null> {
  const login = await loadWidget()
  return new Promise((resolve) => login.auth({ bot_id: botId, request_access: 'write', lang: 'ru' }, (d) => resolve(d || null)))
}
