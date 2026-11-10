import type {
  AdminInvoiceRow,
  AdminMe,
  AdminSettings,
  AdminSettingsPatch,
  AdminUserDetails,
  Article,
  ArticleInput,
  ArticleKind,
  ArticlePatch,
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

/** Все запросы админки. Описание - docs/api.txt */
export interface AdminApi {
  /** Тот же вход, что в кабинете, права проверяет /admin/me */
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
  /** Все разделы «Информация» и «Помощь», включая выключенные */
  getArticles(): Promise<Article[]>
  createArticle(input: ArticleInput): Promise<Article>
  updateArticle(id: number, patch: ArticlePatch): Promise<Article>
  deleteArticle(id: number): Promise<void>
  /** Новый порядок разделов одного вида: ids сверху вниз, бэкенд проставляет sequence_number. Ответ - все разделы */
  reorderArticles(kind: ArticleKind, ids: number[]): Promise<Article[]>
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
  getArticles: () => http('GET', '/admin/articles'),
  createArticle: (input) => http('POST', '/admin/articles', input),
  updateArticle: (id, patch) => http('PATCH', `/admin/articles/${id}`, patch),
  deleteArticle: (id) => http('DELETE', `/admin/articles/${id}`),
  reorderArticles: (kind, ids) => http('PUT', '/admin/articles/order', { kind, ids }),
  getStatsRange: () => http('GET', '/admin/stats/range'),
  getUsersStats: (q) => http('GET', '/admin/stats/users', undefined, q),
  getDepositsStats: (q) => http('GET', '/admin/stats/deposits', undefined, q),
  getPurchasesStats: (q) => http('GET', '/admin/stats/purchases', undefined, q),
}

/** Роль тестового входа на моках: по умолчанию владелец, для проверки поддержки - SUPPORT_AGENT в localStorage */
export const MOCK_ROLE_KEY = 'vpnhub.admin.mock-role'

/** Тестовые данные вместо API: VITE_USE_MOCKS=true, или локальная разработка без VITE_API_URL. В боевой сборке только явно */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' || (import.meta.env.DEV && !import.meta.env.VITE_API_URL)

// тестовый бэкенд лежит отдельным чанком и с настоящим API не грузится
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
