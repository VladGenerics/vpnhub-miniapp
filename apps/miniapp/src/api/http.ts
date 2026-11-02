import { createHttpClient } from '@vpnhub/shared'
import { isTelegram, tg } from '../lib/telegram'

// В Telegram запросы идут с initData, в браузере — с токеном после входа

export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

export const { http, authToken, setUnauthorizedHandler } = createHttpClient({
  baseUrl: API_URL,
  tokenKey: 'vpnhub.token',
  getInitData: () => (isTelegram ? tg?.initData : null),
})

export { ApiError } from '@vpnhub/shared'
