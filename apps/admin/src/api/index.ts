import type {
  AdminInvoiceRow,
  AdminMe,
  AdminSettings,
  AdminSettingsPatch,
  AdminUserDetails,
  AdminUserRow,
  AuthResponse,
  BalanceAdjustRequest,
  Dashboard,
  DepositsStats,
  InvoicesParams,
  LedgerEntry,
  ListParams,
  Paginated,
  PaymentMethod,
  PaymentMethodPatch,
  PurchasesStatsPoint,
  ReferralRow,
  StatsQuery,
  StatsRange,
  TelegramAuthData,
  UsersParams,
  UsersStats,
} from '@vpnhub/shared'
import { http } from './http'

/** Контракт API админ-панели. Описание эндпоинтов — docs/api.md. */
export interface AdminApi {
  /** Тот же вход, что в кабинете; права проверяет /admin/me */
  loginTelegram(req: TelegramAuthData): Promise<AuthResponse>
  getMe(): Promise<AdminMe>
  getDashboard(tz: string): Promise<Dashboard>
  getUsers(p: UsersParams): Promise<Paginated<AdminUserRow>>
  getUser(id: number): Promise<AdminUserDetails>
  getUserReferrals(id: number, p: ListParams): Promise<Paginated<ReferralRow>>
  getUserLedger(id: number, p: ListParams): Promise<Paginated<LedgerEntry>>
  adjustBalance(id: number, req: BalanceAdjustRequest): Promise<AdminUserDetails>
  getInvoices(p: InvoicesParams): Promise<Paginated<AdminInvoiceRow>>
  getPaymentMethods(): Promise<PaymentMethod[]>
  updatePaymentMethod(id: number, patch: PaymentMethodPatch): Promise<PaymentMethod>
  getSettings(): Promise<AdminSettings>
  updateSettings(patch: AdminSettingsPatch): Promise<AdminSettings>
  getStatsRange(): Promise<StatsRange>
  getUsersStats(q: StatsQuery): Promise<UsersStats>
  getDepositsStats(q: StatsQuery): Promise<DepositsStats>
  getPurchasesStats(q: StatsQuery): Promise<PurchasesStatsPoint[]>
}

const httpApi: AdminApi = {
  loginTelegram: (req) => http('POST', '/auth/telegram', req),
  getMe: () => http('GET', '/admin/me'),
  getDashboard: (tz) => http('GET', '/admin/dashboard', undefined, { tz }),
  getUsers: (p) => http('GET', '/admin/users', undefined, p),
  getUser: (id) => http('GET', `/admin/users/${id}`),
  getUserReferrals: (id, p) => http('GET', `/admin/users/${id}/referrals`, undefined, p),
  getUserLedger: (id, p) => http('GET', `/admin/users/${id}/ledger`, undefined, p),
  adjustBalance: (id, req) => http('POST', `/admin/users/${id}/balance`, req),
  getInvoices: (p) => http('GET', '/admin/invoices', undefined, p),
  getPaymentMethods: () => http('GET', '/admin/payment-methods'),
  updatePaymentMethod: (id, patch) => http('PATCH', `/admin/payment-methods/${id}`, patch),
  getSettings: () => http('GET', '/admin/settings'),
  updateSettings: (patch) => http('PATCH', '/admin/settings', patch),
  getStatsRange: () => http('GET', '/admin/stats/range'),
  getUsersStats: (q) => http('GET', '/admin/stats/users', undefined, q),
  getDepositsStats: (q) => http('GET', '/admin/stats/deposits', undefined, q),
  getPurchasesStats: (q) => http('GET', '/admin/stats/purchases', undefined, q),
}

/** Роль демо-входа: выбирается на странице входа, чтобы показать и режим поддержки (только чтение) */
export const DEMO_ROLE_KEY = 'vpnhub.admin.demo-role'

/** Моки включены явно (VITE_USE_MOCKS=true) или когда не задан адрес API. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_URL

/** Демо-бэкенд подгружается отдельным файлом и только в демо-режиме — с настоящим API этот файл не загружается */
function lazyMock(): AdminApi {
  let loaded: Promise<AdminApi> | null = null
  const load = () => (loaded ??= import('./mock').then((m) => m.mockApi))
  return new Proxy({} as AdminApi, {
    get:
      (_, key: keyof AdminApi) =>
      async (...args: unknown[]) => {
        const api = await load()
        return (api[key] as (...a: unknown[]) => unknown)(...args)
      },
  })
}

export const api: AdminApi = USE_MOCKS ? lazyMock() : httpApi
