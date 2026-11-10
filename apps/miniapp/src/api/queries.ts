import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ArticleKind, AutoRenewal, CreateInvoiceRequest, Invoice, PurchaseRequest, Subscription } from '@vpnhub/shared'
import { ApiError, isValidTariffs, required, shouldRetry } from '@vpnhub/shared'
import { api } from './index'
import { draft, type Draft } from '../lib/draft'

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

/**
 * Эпоха авторизации: растёт при входе, выходе и смене аккаунта в соседней вкладке.
 * Мутация запоминает эпоху на старте, и поздний ответ прежнего аккаунта не попадает в кэш нового
 */
export const authEpoch = { value: 0 }
const epochCtx = () => ({ epoch: authEpoch.value })
const sameEpoch = (ctx: { epoch: number } | undefined) => ctx?.epoch === authEpoch.value

/** Успешная покупка снимает свой черновик (если он того же вида), даже когда страницу уже закрыли */
const clearDraft = (kind: Draft['kind']) => draft.get()?.kind === kind && draft.clear()

export const keys = {
  me: ['me'] as const,
  subscription: ['subscription'] as const,
  tariffs: ['tariffs'] as const,
  paymentMethods: ['payment-methods'] as const,
  settings: ['settings'] as const,
  articles: ['articles'] as const,
  invoice: (id: number) => ['invoice', id] as const,
  unpaidInvoices: ['invoices', 'UNPAID'] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api.getMe().then(required) })
export const useSubscription = () => useQuery({ queryKey: keys.subscription, queryFn: api.getSubscription })
export const useTariffs = () =>
  useQuery({
    queryKey: keys.tariffs,
    queryFn: async () => {
      const t = required(await api.getTariffs())
      // кривые тарифы - ошибка с повтором, а не покупка по цене NaN
      if (!isValidTariffs(t)) throw new ApiError(0, 'Не удалось загрузить цены, попробуйте позже')
      return t
    },
    staleTime: 5 * 60_000,
  })
export const usePaymentMethods = () => useQuery({ queryKey: keys.paymentMethods, queryFn: () => api.getPaymentMethods().then(required) })
/** Разделы «Информация» / «Помощь» одного вида, включённые и по порядку */
export const useArticles = (kind: ArticleKind) =>
  useQuery({
    queryKey: keys.articles,
    queryFn: async () => {
      const list = required(await api.getArticles())
      if (!Array.isArray(list)) throw new ApiError(0, 'Не удалось загрузить разделы, попробуйте позже')
      // пропускаем битые записи
      return list
        .filter((a) => a && typeof a.slug === 'string' && typeof a.title === 'string')
        .map((a) => ({ ...a, emoji: a.emoji ?? '', body: typeof a.body === 'string' ? a.body : '', sequence_number: Number(a.sequence_number) || 0 }))
    },
    staleTime: 5 * 60_000,
    select: (list) => list.filter((a) => a.kind === kind && a.is_active !== false).sort((a, b) => a.sequence_number - b.sequence_number),
  })
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
    onMutate: epochCtx,
    onSuccess: (me, _email, ctx) => (sameEpoch(ctx) ? setFresh(qc, keys.me, me) : undefined),
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CreateInvoiceRequest) => api.createInvoice(req).then(required),
    onMutate: epochCtx,
    onSuccess: (inv, _req, ctx) => {
      if (!sameEpoch(ctx)) return
      qc.setQueryData(keys.invoice(inv.id), inv)
      qc.invalidateQueries({ queryKey: keys.unpaidInvoices })
    },
  })
}

export function usePurchase() {
  const qc = useQueryClient()
  return useMutation({
    // пустой ответ на денежную операцию - не «успех»: показываем ошибку, а не «Подписка оформлена»
    mutationFn: (req: PurchaseRequest) => api.purchase(req).then(required),
    onMutate: epochCtx,
    onSuccess: async (sub, _req, ctx) => {
      if (!sameEpoch(ctx)) return
      clearDraft('new')
      await setFresh(qc, keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useRenew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => api.renew(days).then(required),
    onMutate: epochCtx,
    onSuccess: async (sub, _days, ctx) => {
      if (!sameEpoch(ctx)) return
      clearDraft('renew')
      await setFresh(qc, keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useBuySlots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (count: number) => api.buySlots(count).then(required),
    onMutate: epochCtx,
    onSuccess: async (sub, _count, ctx) => {
      if (!sameEpoch(ctx)) return
      clearDraft('slots')
      await setFresh(qc, keys.subscription, sub)
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useSetAutoRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: AutoRenewal) => api.setAutoRenewal(v),
    onMutate: epochCtx,
    onSuccess: (auto_renewal, _v, ctx) => sameEpoch(ctx) && setFresh<Subscription | null>(qc, keys.subscription, (s) => (s ? { ...s, auto_renewal } : s)),
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
