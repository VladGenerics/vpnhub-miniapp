import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutoRenewal, CreateInvoiceRequest, PurchaseRequest, Subscription } from '@vpnhub/shared'
import { api } from './index'

const isClientError = (err: unknown) => {
  const status = (err as { status?: number }).status ?? 0
  return status >= 400 && status < 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx повторять нет смысла, повторяем только обрыв сети и 5xx
      retry: (count, err) => count < 1 && !isClientError(err),
      refetchOnWindowFocus: true,
    },
  },
})

export const keys = {
  me: ['me'] as const,
  subscription: ['subscription'] as const,
  tariffs: ['tariffs'] as const,
  paymentMethods: ['payment-methods'] as const,
  settings: ['settings'] as const,
  invoice: (id: number) => ['invoice', id] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.getMe })
export const useSubscription = () => useQuery({ queryKey: keys.subscription, queryFn: api.getSubscription })
export const useTariffs = () => useQuery({ queryKey: keys.tariffs, queryFn: api.getTariffs, staleTime: 5 * 60_000 })
export const usePaymentMethods = () => useQuery({ queryKey: keys.paymentMethods, queryFn: api.getPaymentMethods })
export const useSettings = (enabled = true) => useQuery({ queryKey: keys.settings, queryFn: api.getSettings, staleTime: 5 * 60_000, enabled })

/** Активная подписка или null */
export function useActiveSubscription() {
  const q = useSubscription()
  return { ...q, active: q.data?.status === 'ACTIVE' ? q.data : null }
}

/** Опрашивает счёт, пока он не оплачен, после оплаты обновляет баланс */
export function useInvoice(id: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.invoice(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const inv = await api.getInvoice(id!)
      if (inv.status === 'PAID') qc.invalidateQueries({ queryKey: keys.me })
      return inv
    },
    refetchInterval: (q) => (q.state.data?.status === 'UNPAID' || !q.state.data ? 2000 : false),
  })
}

export function useBindEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.bindEmail(email),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  })
}

export function useCreateInvoice() {
  return useMutation({ mutationFn: (req: CreateInvoiceRequest) => api.createInvoice(req) })
}

export function usePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: PurchaseRequest) => api.purchase(req),
    onSuccess: (sub) => {
      qc.setQueryData(keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useSetAutoRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: AutoRenewal) => api.setAutoRenewal(v),
    onSuccess: (auto_renewal) => qc.setQueryData<Subscription | null>(keys.subscription, (s) => (s ? { ...s, auto_renewal } : s)),
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
