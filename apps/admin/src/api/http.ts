import { createHttpClient } from '@vpnhub/shared'

/* Клиент API панели: токен после входа через Telegram; внутри Telegram — initData. */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp

export const { http, authToken, setUnauthorizedHandler } = createHttpClient({
  baseUrl: API_URL,
  tokenKey: 'vpnhub.admin.token',
  getInitData: () => tg?.initData || null,
})

/** Открыто ли внутри Telegram (initData есть только там) */
export const isTelegram = !!tg?.initData
