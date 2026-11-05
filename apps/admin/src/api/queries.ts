import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminSettingsPatch,
  AdminUserDetails,
  BalanceAdjustRequest,
  InvoicesParams,
  ListParams,
  PaymentMethod,
  PaymentMethodPatch,
  StatsQuery,
  UsersParams,
} from '@vpnhub/shared'
import { api } from './index'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 401/403/404 повторять нет смысла
      retry: (count, err) => count < 1 && ![401, 403, 404].includes((err as { status?: number }).status ?? 0),
      refetchOnWindowFocus: true,
    },
  },
})

/** Пояс браузера: в нём считаются «сегодня» и интервалы статистики */
export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

export const keys = {
  me: ['admin-me'] as const,
  dashboard: ['dashboard'] as const,
  users: (p: UsersParams) => ['users', p] as const,
  user: (id: number) => ['user', id] as const,
  referrals: (id: number, p: ListParams) => ['user', id, 'referrals', p] as const,
  ledger: (id: number, p: ListParams) => ['user', id, 'ledger', p] as const,
  invoices: (p: InvoicesParams) => ['invoices', p] as const,
  paymentMethods: ['payment-methods'] as const,
  settings: ['settings'] as const,
  statsRange: ['stats', 'range'] as const,
  stats: (kind: string, q: StatsQuery) => ['stats', kind, q] as const,
}

export const useAdminMe = (enabled: boolean) => useQuery({ queryKey: keys.me, queryFn: api.getMe, enabled, staleTime: 5 * 60_000 })

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api.getDashboard(TZ), refetchInterval: 60_000 })

// пока грузится следующая страница, показываем предыдущую, чтобы таблица не прыгала
export const useUsers = (p: UsersParams) => useQuery({ queryKey: keys.users(p), queryFn: () => api.getUsers(p), placeholderData: keepPreviousData })
export const useUser = (id: number) => useQuery({ queryKey: keys.user(id), queryFn: () => api.getUser(id), enabled: Number.isInteger(id) && id > 0 })
// прошлую страницу показываем только для того же пользователя, иначе в карточке B мелькнёт история A
const samePlaceholder =
  (same: (prevKey: readonly unknown[]) => boolean) =>
  <T>(prev: T | undefined, prevQuery?: { queryKey: readonly unknown[] }) =>
    prevQuery && same(prevQuery.queryKey) ? prev : undefined

export const useReferrals = (id: number, p: ListParams) =>
  useQuery({ queryKey: keys.referrals(id, p), queryFn: () => api.getUserReferrals(id, p), placeholderData: samePlaceholder((k) => k[1] === id) })
export const useLedger = (id: number, p: ListParams) =>
  useQuery({ queryKey: keys.ledger(id, p), queryFn: () => api.getUserLedger(id, p), placeholderData: samePlaceholder((k) => k[1] === id) })
export const useInvoices = (p: InvoicesParams) =>
  useQuery({
    queryKey: keys.invoices(p),
    queryFn: () => api.getInvoices(p),
    // в общем списке счетов предыдущую страницу держим всегда, во вкладке пользователя - только для него же
    placeholderData: p.user_id ? samePlaceholder((k) => (k[1] as InvoicesParams | undefined)?.user_id === p.user_id) : keepPreviousData,
  })

export const usePaymentMethods = () => useQuery({ queryKey: keys.paymentMethods, queryFn: api.getPaymentMethods })
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.getSettings })

export function useAdjustBalance(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: BalanceAdjustRequest) => api.adjustBalance(id, req),
    // ключ берём из ответа: если карточку успели сменить, данные A не попадут под B
    onSuccess: (user: AdminUserDetails) => {
      qc.setQueryData(keys.user(user.id), user)
      qc.invalidateQueries({ queryKey: ['user', user.id, 'ledger'] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: PaymentMethodPatch }) => api.updatePaymentMethod(id, patch),
    onSuccess: (m: PaymentMethod) => qc.setQueryData<PaymentMethod[]>(keys.paymentMethods, (list) => list?.map((x) => (x.id === m.id ? m : x))),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: AdminSettingsPatch) => api.updateSettings(patch),
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  })
}

// --- статистика ---

export const useStatsRange = () => useQuery({ queryKey: keys.statsRange, queryFn: api.getStatsRange, staleTime: 10 * 60_000 })

const statsOptions = { staleTime: 60_000, placeholderData: keepPreviousData } as const

export const useUsersStats = (q: StatsQuery | null) =>
  useQuery({ queryKey: keys.stats('users', q!), queryFn: () => api.getUsersStats(q!), enabled: !!q, ...statsOptions })
export const useDepositsStats = (q: StatsQuery | null) =>
  useQuery({ queryKey: keys.stats('deposits', q!), queryFn: () => api.getDepositsStats(q!), enabled: !!q, ...statsOptions })
export const usePurchasesStats = (q: StatsQuery | null) =>
  useQuery({ queryKey: keys.stats('purchases', q!), queryFn: () => api.getPurchasesStats(q!), enabled: !!q, ...statsOptions })
