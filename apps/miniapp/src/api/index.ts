import type {
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
import { mockApi } from './mock'

/** Контракт API кабинета. Описание эндпоинтов — docs/api.md. */
export interface UserApi {
  /** Вход с сайта через Telegram Login Widget; новый пользователь регистрируется */
  loginTelegram(req: TelegramLoginRequest): Promise<AuthResponse>
  getMe(): Promise<Me>
  /** null — подписки нет */
  getSubscription(): Promise<Subscription | null>
  getTariffs(): Promise<Tariffs>
  getPaymentMethods(): Promise<PaymentMethod[]>
  getSettings(): Promise<PublicSettings>
  createInvoice(req: CreateInvoiceRequest): Promise<Invoice>
  getInvoice(id: number): Promise<Invoice>
  purchase(req: PurchaseRequest): Promise<Subscription>
  setAutoRenewal(v: AutoRenewal): Promise<AutoRenewal>
  releaseSlot(id: number): Promise<void>
  deleteSlot(id: number): Promise<void>
}

const httpApi: UserApi = {
  loginTelegram: (req) => http('POST', '/auth/telegram', req),
  getMe: () => http('GET', '/me'),
  getSubscription: async () => {
    try {
      const s = await http<Subscription>('GET', '/subscription')
      return s.status === 'NOT_FOUND' ? null : s
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
  getTariffs: () => http('GET', '/tariffs'),
  getPaymentMethods: () => http('GET', '/payment-methods'),
  getSettings: () => http('GET', '/settings'),
  createInvoice: (req) => http('POST', '/invoices', req),
  getInvoice: (id) => http('GET', `/invoices/${id}`),
  purchase: (req) => http('POST', '/subscription/purchase', req),
  setAutoRenewal: (v) => http('PUT', '/subscription/auto-renewal', v),
  releaseSlot: (id) => http('POST', `/subscription/slots/${id}/release`),
  deleteSlot: (id) => http('DELETE', `/subscription/slots/${id}`),
}

/** Моки включены явно (VITE_USE_MOCKS=true) или когда не задан адрес API. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_URL

export const api: UserApi = USE_MOCKS ? mockApi : httpApi
