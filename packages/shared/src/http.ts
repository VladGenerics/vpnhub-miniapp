// HTTP-клиент для кабинета и админки.
// В Telegram шлём `Authorization: tma <initData>`, в браузере - `Bearer <token>` после входа.

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
  /** Адрес API без слэша на конце, например https://api.example.com/api или /api */
  baseUrl: string
  /** Ключ localStorage, где лежит токен */
  tokenKey: string
  /** initData, если открыто внутри Telegram */
  getInitData?: () => string | null | undefined
  /** Сколько ждать ответа, мс */
  timeout?: number
}

/**
 * Обязательный ответ: типы TypeScript в рантайме ничего не проверяют, и null вместо объекта
 * дал бы вечную загрузку или пустой экран. Делаем из него понятную ошибку с повтором
 */
export function required<T>(data: T | null | undefined): T {
  if (data === null || data === undefined || typeof data !== 'object') throw new ApiError(0, 'Сервер прислал пустой или неверный ответ, попробуйте ещё раз')
  return data
}

/** Повтор чтения: только обрыв сети и 5xx, ответ 4xx повтором не исправить */
export function shouldRetry(count: number, err: unknown) {
  const status = (err as { status?: number } | null)?.status ?? 0
  return count < 1 && !(status >= 400 && status < 500)
}

/** { page: 2, q: '' } → "?page=2" */
export function toQuery(params?: object): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params) as [string, unknown][]) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// FastAPI отдаёт detail строкой, а ошибки валидации - списком [{ loc, msg }]
function errorText(data: unknown, status: number): string {
  const d = data as { detail?: unknown; message?: unknown } | undefined
  if (typeof d?.detail === 'string') return d.detail
  if (Array.isArray(d?.detail) && typeof d.detail[0]?.msg === 'string') return d.detail[0].msg
  if (typeof d?.message === 'string') return d.message
  if (status >= 500) return 'Сервер временно недоступен, попробуйте позже'
  return `Ошибка ${status}`
}

export function createHttpClient({ baseUrl, tokenKey, getInitData, timeout = 30_000 }: HttpClientOptions) {
  // если хранилище запрещено (приватный режим, настройки WebView), токен живёт в памяти до перезагрузки,
  // иначе после входа интерфейс считал бы себя авторизованным, а запросы шли бы без токена
  let memToken: string | null = null
  const authToken = {
    /** Ключ в localStorage, чтобы ловить вход и выход в соседних вкладках */
    key: tokenKey,
    get(): string | null {
      try {
        return localStorage.getItem(tokenKey) ?? memToken
      } catch {
        return memToken
      }
    },
    set(token: string | null) {
      memToken = token
      try {
        if (token) localStorage.setItem(tokenKey, token)
        else localStorage.removeItem(tokenKey)
      } catch {
        // приватный режим или запрет хранилища: остаётся токен в памяти
      }
    },
  }

  let onUnauthorized: ((via: 'token' | 'telegram') => void) | null = null

  /** Вызывается на 401: протух токен сайта или initData Telegram. Ставит AuthProvider. */
  function setUnauthorizedHandler(fn: ((via: 'token' | 'telegram') => void) | null) {
    onUnauthorized = fn
  }

  async function http<T>(method: string, path: string, body?: unknown, query?: object): Promise<T> {
    const initData = getInitData?.()
    const token = initData ? null : authToken.get()
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (initData) headers.Authorization = `tma ${initData}`
    else if (token) headers.Authorization = `Bearer ${token}`

    // AbortSignal.timeout нет в старых WebView, поэтому таймер руками.
    // Таймер держим до конца чтения тела: сервер может прислать заголовки и зависнуть на теле
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)
    const netError = () => new ApiError(0, ctrl.signal.aborted ? 'Сервер долго не отвечает, попробуйте ещё раз' : 'Нет связи с сервером. Проверьте интернет')
    let res: Response
    let text: string
    try {
      res = await fetch(`${baseUrl}${path}${toQuery(query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      })
      // пустой ответ - норма (204, «подписки нет»), а не-JSON с кодом 200 - почти всегда index.html вместо API:
      // запрос ушёл не туда (VITE_API_URL или прокси /api). Молча вернуть undefined нельзя.
      // Оборванное тело у успешного ответа - ошибка сети, а не пустой ответ
      try {
        text = res.status === 204 ? '' : await res.text()
      } catch {
        if (res.ok) throw netError()
        text = ''
      }
    } catch (e) {
      throw e instanceof ApiError ? e : netError()
    } finally {
      clearTimeout(timer)
    }

    let data: unknown
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        if (res.ok) throw new ApiError(res.status, 'Сервер ответил не JSON. Проверьте адрес API (VITE_API_URL) и прокси /api')
      }
    }
    // сбрасываем только свой токен и только если его не успели сменить: поздний 401 старой сессии
    // не должен выкинуть пользователя, который уже вошёл заново
    if (res.status === 401 && token && authToken.get() === token) {
      authToken.set(null)
      onUnauthorized?.('token')
    }
    // initData сам не обновится: Telegram выдаёт новую только при повторном открытии приложения
    if (res.status === 401 && initData) onUnauthorized?.('telegram')
    if (!res.ok) throw new ApiError(res.status, errorText(data, res.status), data)
    return data as T
  }

  return { http, authToken, setUnauthorizedHandler }
}
