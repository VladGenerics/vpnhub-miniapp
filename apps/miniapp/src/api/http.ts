import { createHttpClient } from '@vpnhub/shared'
import { isTelegram, tg } from '../lib/telegram'

/* Клиент API кабинета: в Telegram — initData, в браузере — токен после входа (см. @vpnhub/shared/http). */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

export const { http, authToken, setUnauthorizedHandler } = createHttpClient({
  baseUrl: API_URL,
  tokenKey: 'vpnhub.token',
  getInitData: () => (isTelegram ? tg?.initData : null),
})

export { ApiError } from '@vpnhub/shared'
