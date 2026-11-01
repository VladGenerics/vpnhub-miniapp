/*
 * HTTP-клиент для кабинета и админки. Авторизация:
 *  - внутри Telegram — заголовок `Authorization: tma <initData>`
 *    (бэкенд проверяет подпись initData токеном бота);
 *  - в браузере — `Authorization: Bearer <token>`, токен выдаёт бэкенд при входе.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
  }
}

export interface HttpClientOptions {
  /** Адрес API без завершающего слэша, например https://api.example.com/api */
  baseUrl: string
  /** Ключ localStorage для токена сайта */
  tokenKey: string
  /** initData мини-аппа, если страница открыта внутри Telegram */
  getInitData?: () => string | null | undefined
}

/** Строка запроса без пустых значений: { page: 2, q: '' } → "?page=2" */
export function toQuery(params?: object): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params) as [string, unknown][]) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export function createHttpClient({ baseUrl, tokenKey, getInitData }: HttpClientOptions) {
  const authToken = {
    get(): string | null {
      try {
        return localStorage.getItem(tokenKey)
      } catch {
        return null
      }
    },
    set(token: string | null) {
      try {
        if (token) localStorage.setItem(tokenKey, token)
        else localStorage.removeItem(tokenKey)
      } catch {
        /* хранилище недоступно */
      }
    },
  }

  let onUnauthorized: (() => void) | null = null

  /** Что делать, когда сессия на сайте истекла (401) — задаёт AuthProvider */
  function setUnauthorizedHandler(fn: (() => void) | null) {
    onUnauthorized = fn
  }

  async function http<T>(method: string, path: string, body?: unknown, query?: object): Promise<T> {
    const initData = getInitData?.()
    const token = initData ? null : authToken.get()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (initData) headers.Authorization = `tma ${initData}`
    else if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${baseUrl}${path}${toQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = res.status === 204 ? undefined : await res.json().catch(() => undefined)
    // в Telegram сессию не сбросить — initData приходит от клиента заново при каждом открытии
    if (res.status === 401 && !initData) {
      authToken.set(null)
      onUnauthorized?.()
    }
    if (!res.ok) {
      const msg = data as { detail?: unknown; message?: string } | undefined
      const text = typeof msg?.detail === 'string' ? msg.detail : (msg?.message ?? `HTTP ${res.status}`)
      throw new ApiError(res.status, text, data)
    }
    return data as T
  }

  return { http, authToken, setUnauthorizedHandler }
}
