import { DEFAULT_ARTICLES } from '@vpnhub/shared'
import type {
  Article,
  AuthResponse,
  TelegramLoginRequest,
  AutoRenewal,
  CreateInvoiceRequest,
  Invoice,
  Me,
  PaymentMethod,
  PublicSettings,
  PurchaseRequest,
  Subscription,
  Tariffs,
} from '@vpnhub/shared'
import { ApiError, http } from './http'

/** Все запросы кабинета. Описание - docs/api.md */
export interface UserApi {
  /** Вход с сайта через Telegram, новый пользователь регистрируется */
  loginTelegram(req: TelegramLoginRequest): Promise<AuthResponse>
  getMe(): Promise<Me>
  bindEmail(email: string): Promise<Me>
  /** null - подписки нет */
  getSubscription(): Promise<Subscription | null>
  getTariffs(): Promise<Tariffs>
  getPaymentMethods(): Promise<PaymentMethod[]>
  getSettings(): Promise<PublicSettings>
  /** Включённые разделы «Информация» и «Помощь», по sequence_number */
  getArticles(): Promise<Article[]>
  createInvoice(req: CreateInvoiceRequest): Promise<Invoice>
  getInvoice(id: number): Promise<Invoice>
  /** Неоплаченные счета пользователя (status = UNPAID), новые сверху */
  getUnpaidInvoices(): Promise<Invoice[]>
  purchase(req: PurchaseRequest): Promise<Subscription>
  /** Пробная подписка: один раз на пользователя (Me.has_used_trial_subscription), бесплатно */
  activateTrial(): Promise<Subscription>
  /** Продление активной подписки заранее. Устройства остаются, дни прибавляются к сроку */
  renew(days: number): Promise<Subscription>
  /** Докупить слоты к активной подписке: деньги списываются сразу, срок не меняется */
  buySlots(count: number): Promise<Subscription>
  setAutoRenewal(v: AutoRenewal): Promise<AutoRenewal>
  releaseSlot(id: number): Promise<void>
  deleteSlot(id: number): Promise<void>
}

const httpApi: UserApi = {
  loginTelegram: (req) => http('POST', '/auth/telegram', req),
  getMe: () => http('GET', '/me'),
  bindEmail: (email) => http('PUT', '/me/email', { email }),
  getSubscription: async () => {
    try {
      const s = await http<Subscription | null>('GET', '/subscription')
      // подписки нет: 404, пустой ответ или status NOT_FOUND
      return !s || s.status === 'NOT_FOUND' ? null : s
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
  getTariffs: () => http('GET', '/tariffs'),
  getPaymentMethods: () => http('GET', '/payment-methods'),
  getSettings: () => http('GET', '/settings'),
  getArticles: async () => {
    try {
      return await http<Article[]>('GET', '/articles')
    } catch (e) {
      // ручки на бэкенде ещё нет - показываем разделы по умолчанию, а не пустую страницу
      if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)) return DEFAULT_ARTICLES
      throw e
    }
  },
  createInvoice: (req) => http('POST', '/invoices', req),
  getInvoice: (id) => http('GET', `/invoices/${id}`),
  getUnpaidInvoices: () => http('GET', '/invoices?status=UNPAID'),
  purchase: (req) => http('POST', '/subscription/purchase', req),
  activateTrial: () => http('POST', '/subscription/trial'),
  // отдельной ручки нет: покупка на активную подписку и есть продление. Будет своя - поменять здесь
  renew: async (days) => {
    const sub = await httpApi.getSubscription()
    if (!sub) throw new ApiError(404, 'Подписка не найдена')
    return http('POST', '/subscription/purchase', { days, devices: sub.slots.length })
  },
  buySlots: (count) => http('POST', '/subscription/slots', { count }),
  setAutoRenewal: (v) => http('PUT', '/subscription/auto-renewal', v),
  releaseSlot: (id) => http('POST', `/subscription/slots/${id}/release`),
  deleteSlot: (id) => http('DELETE', `/subscription/slots/${id}`),
}

/** Тестовые данные вместо API: VITE_USE_MOCKS=true, или локальная разработка без VITE_API_URL. В боевой сборке только явно */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' || (import.meta.env.DEV && !import.meta.env.VITE_API_URL)

// тестовый бэкенд - отдельный чанк: в боевую сборку он не попадает и не исполняется
function lazyMock(): UserApi {
  let loaded: Promise<UserApi> | null = null
  const load = () => (loaded ??= import('./mock').then((m) => m.mockApi))
  return new Proxy({} as UserApi, {
    get:
      (_, key: keyof UserApi) =>
      async (...args: unknown[]) => {
        const api = await load()
        return (api[key] as (...a: unknown[]) => unknown)(...args)
      },
  })
}

export const api: UserApi = USE_MOCKS ? lazyMock() : httpApi
