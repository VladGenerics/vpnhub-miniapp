import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutoRenewal, CreateInvoiceRequest, Invoice, PurchaseRequest, Subscription } from '@vpnhub/shared'
import { required, shouldRetry } from '@vpnhub/shared'
import { api } from './index'

const isClientError = (err: unknown) => {
  const status = (err as { status?: number } | null)?.status ?? 0
  return status >= 400 && status < 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx повторять нет смысла, повторяем только обрыв сети и 5xx
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
  },
})

/**
 * Кладёт ответ мутации в кэш. Сначала отменяем идущее чтение того же ключа:
 * иначе GET, начатый до мутации, вернётся позже и затрёт свежие данные старыми
 */
async function setFresh<T>(qc: QueryClient, queryKey: readonly unknown[], data: T | ((old: T | undefined) => T | undefined)) {
  await qc.cancelQueries({ queryKey })
  qc.setQueryData<T>(queryKey, data)
}

export const keys = {
  me: ['me'] as const,
  subscription: ['subscription'] as const,
  tariffs: ['tariffs'] as const,
  paymentMethods: ['payment-methods'] as const,
  settings: ['settings'] as const,
  invoice: (id: number) => ['invoice', id] as const,
  unpaidInvoices: ['invoices', 'UNPAID'] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api.getMe().then(required) })
export const useSubscription = () => useQuery({ queryKey: keys.subscription, queryFn: api.getSubscription })
export const useTariffs = () => useQuery({ queryKey: keys.tariffs, queryFn: () => api.getTariffs().then(required), staleTime: 5 * 60_000 })
export const usePaymentMethods = () => useQuery({ queryKey: keys.paymentMethods, queryFn: () => api.getPaymentMethods().then(required) })
export const useSettings = (enabled = true) =>
  useQuery({ queryKey: keys.settings, queryFn: () => api.getSettings().then(required), staleTime: 5 * 60_000, enabled })

/** Активная подписка или null */
export function useActiveSubscription() {
  const q = useSubscription()
  return { ...q, active: q.data?.status === 'ACTIVE' ? q.data : null }
}

/** Опрашивает счёт, пока он не оплачен. После оплаты обновляет баланс и список неоплаченных */
export function useInvoice(id: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.invoice(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const inv = required(await api.getInvoice(id!))
      if (inv.status !== 'UNPAID') {
        qc.invalidateQueries({ queryKey: keys.unpaidInvoices })
        if (inv.status === 'PAID') qc.invalidateQueries({ queryKey: keys.me })
      }
      return inv
    },
    // счёт не найден или чужой (4xx) - опрос бесполезен, остаётся ручная проверка
    refetchInterval: (q) => (isClientError(q.state.error) ? false : q.state.data?.status === 'UNPAID' || !q.state.data ? 3000 : false),
  })
}

/** Неоплаченные счета. Пока они есть, список обновляется: оплаченный счёт пропадает, баланс обновляется */
export function useUnpaidInvoices() {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.unpaidInvoices,
    queryFn: async () => {
      const prev = qc.getQueryData<Invoice[]>(keys.unpaidInvoices)
      const list = required(await api.getUnpaidInvoices())
      // счёт пропал из списка - его оплатили или он истёк, баланс мог измениться
      if (prev?.some((p) => !list.some((n) => n.id === p.id))) qc.invalidateQueries({ queryKey: keys.me })
      return list
    },
    refetchInterval: (q) => (q.state.data?.length ? 10_000 : false),
  })
}

export function useBindEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.bindEmail(email),
    onSuccess: (me) => setFresh(qc, keys.me, me),
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CreateInvoiceRequest) => api.createInvoice(req),
    onSuccess: (inv) => {
      qc.setQueryData(keys.invoice(inv.id), inv)
      qc.invalidateQueries({ queryKey: keys.unpaidInvoices })
    },
  })
}

export function usePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: PurchaseRequest) => api.purchase(req),
    onSuccess: async (sub) => {
      await setFresh(qc, keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useRenew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => api.renew(days),
    onSuccess: async (sub) => {
      await setFresh(qc, keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useSetAutoRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: AutoRenewal) => api.setAutoRenewal(v),
    onSuccess: (auto_renewal) => setFresh<Subscription | null>(qc, keys.subscription, (s) => (s ? { ...s, auto_renewal } : s)),
  })
}

export function useReleaseSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.releaseSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.subscription }),
  })
}

export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.subscription }),
  })
}
