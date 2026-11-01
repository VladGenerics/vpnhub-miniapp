import {
  ApiError,
  type AdminInvoiceRow,
  type AdminUserDetails,
  type AdminUserRow,
  type DepositsStatsPoint,
  type Granularity,
  type LedgerEntry,
  type ListParams,
  type Paginated,
  type PurchasesStatsPoint,
  type ReferralRow,
  type SortOrder,
  type SubscriptionStatus,
  type UserRole,
  type UsersStatsPoint,
} from '@vpnhub/shared'
import { DEMO_ROLE_KEY, type AdminApi } from '../index'
import {
  DAY,
  NOW,
  START,
  earnings,
  invoices,
  ledger,
  paymentMethods,
  purchases,
  settings,
  slotsFor,
  subscriptions,
  users,
  type MInvoice,
  type MLedger,
  type MUser,
} from './data'

/*
 * Демо-бэкенд админки в памяти. Отвечает теми же формами данных, что описаны
 * в docs/api.md, с небольшой задержкой, чтобы были видны состояния загрузки.
 */

const iso = (ms: number) => new Date(ms).toISOString()
const delay = <T>(v: T, ms = 180 + Math.random() * 220) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms))
const round2 = (n: number) => Math.round(n * 100) / 100

/* ---------- Индексы ---------- */

const group = <T>(items: T[], key: (i: T) => number | null) => {
  const m = new Map<number, T[]>()
  for (const i of items) {
    const k = key(i)
    if (k === null) continue
    const list = m.get(k)
    if (list) list.push(i)
    else m.set(k, [i])
  }
  return m
}

const invoicesByUser = group(invoices, (i) => i.user_id)
const purchasesByUser = group(purchases, (p) => p.user_id)
const referralsByUser = group(users, (u) => u.referrer_id)
const earningsByUser = group(earnings, (e) => e.user_id)
const ledgerWithIds = ledger.map((l, i) => ({ ...l, id: i + 1 }))
const ledgerByUser = group(ledgerWithIds, (l) => l.user_id)
let ledgerSeq = ledger.length

const paidOf = (userId: number) => (invoicesByUser.get(userId) ?? []).filter((i) => i.status === 'PAID')
const sum = (list: number[]) => round2(list.reduce((s, n) => s + n, 0))

function subStatus(userId: number): { status: SubscriptionStatus; expires: number | null } {
  const s = subscriptions.get(userId)
  if (!s) return { status: 'NOT_FOUND', expires: null }
  return { status: s.expires_at > Date.now() ? 'ACTIVE' : 'DISABLED', expires: s.expires_at }
}

function userRow(u: MUser): AdminUserRow {
  const sub = subStatus(u.id)
  return {
    id: u.id,
    tg_user_id: u.tg_user_id,
    registered_at: iso(u.registered_at),
    language_code: u.language_code,
    has_used_trial_subscription: u.has_used_trial_subscription,
    is_bot: u.is_bot,
    is_blocked_bot: u.is_blocked_bot,
    is_premium: u.is_premium,
    role: u.role,
    balance: u.balance,
    subscription_status: sub.status,
    subscription_expires_at: sub.expires ? iso(sub.expires) : null,
    referrals_count: referralsByUser.get(u.id)?.length ?? 0,
  }
}

function invoiceRow(i: MInvoice): AdminInvoiceRow {
  const owner = users[i.user_id - 1]
  return {
    id: i.id,
    user_id: i.user_id,
    user_tg_id: owner.tg_user_id,
    provider: i.provider,
    amount: i.amount,
    selected_currency: 'RUB',
    status: i.status,
    created_at: iso(i.created_at),
    updated_at: iso(i.paid_at ?? i.created_at),
    external_invoice_id: i.external_invoice_id,
    pay_url: `https://pay.example.com/${i.external_invoice_id}`,
    paid_at: i.paid_at ? iso(i.paid_at) : null,
  }
}

/* ---------- Списки ---------- */

function paginate<T>(list: T[], p: Pick<ListParams, 'page' | 'page_size'>): Paginated<T> {
  const size = Math.min(100, Math.max(1, p.page_size))
  const page = Math.max(1, p.page)
  return { items: list.slice((page - 1) * size, page * size), total: list.length, page, page_size: size }
}

function sortList<T>(list: T[], getters: Record<string, (r: T) => number | string | null>, sort: string | undefined, order: SortOrder = 'desc') {
  const get = getters[sort ?? ''] ?? Object.values(getters)[0]
  const dir = order === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const x = get(a)
    const y = get(b)
    if (x === y) return 0
    if (x === null) return 1 // пустые значения — всегда в конце
    if (y === null) return -1
    return (x < y ? -1 : 1) * dir
  })
}

const isNumeric = (q: string) => /^\d+$/.test(q)

/* ---------- Статистика ---------- */

function truncate(ms: number, g: Granularity) {
  const d = new Date(ms)
  if (g === 'hour') d.setMinutes(0, 0, 0)
  else {
    d.setHours(0, 0, 0, 0)
    if (g !== 'day') d.setDate(1)
    if (g === 'year') d.setMonth(0)
  }
  return d.getTime()
}

function next(ms: number, g: Granularity) {
  const d = new Date(ms)
  if (g === 'hour') d.setHours(d.getHours() + 1)
  else if (g === 'day') d.setDate(d.getDate() + 1)
  else if (g === 'month') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d.getTime()
}

function buckets(from: string, to: string, g: Granularity) {
  const end = Math.min(new Date(to).getTime(), Date.now())
  const out: number[] = []
  for (let t = truncate(new Date(from).getTime(), g); t <= end; t = next(t, g)) out.push(t)
  return out
}

/** Проходит по отсортированным событиям и раскладывает их по интервалам */
function fill<T, P>(starts: number[], g: Granularity, items: T[], time: (i: T) => number, point: (t: number) => P, add: (p: P, i: T) => void) {
  const pts = starts.map(point)
  let k = 0
  while (k < items.length && time(items[k]) < starts[0]) k++
  starts.forEach((s, idx) => {
    const end = next(s, g)
    while (k < items.length && time(items[k]) < end) add(pts[idx], items[k++])
  })
  return pts
}

const usersByReg = [...users].sort((a, b) => a.registered_at - b.registered_at)
// «заблокировали» — только люди: боты считаются отдельной категорией
const blockedTimes = users
  .filter((u) => !u.is_bot)
  .map((u) => u.blocked_at)
  .filter((t): t is number => t !== null)
  .sort((a, b) => a - b)
const paidByTime = invoices.filter((i) => i.paid_at).sort((a, b) => a.paid_at! - b.paid_at!)

const countBefore = (sorted: number[], t: number) => {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < t) lo = mid + 1
    else hi = mid
  }
  return lo
}
const regTimes = usersByReg.map((u) => u.registered_at)
const botTimes = usersByReg.filter((u) => u.is_bot).map((u) => u.registered_at)

function demoRole(): UserRole {
  try {
    return (localStorage.getItem(DEMO_ROLE_KEY) as UserRole | null) ?? 'OWNER'
  } catch {
    return 'OWNER'
  }
}

/* ---------- API ---------- */

export const mockApi: AdminApi = {
  async loginTelegram() {
    return delay({ token: `mock-admin-${Date.now()}` }, 400)
  },

  async getMe() {
    const owner = users[0]
    return delay({ id: owner.id, tg_user_id: owner.tg_user_id, role: demoRole() })
  },

  async getDashboard() {
    const now = Date.now()
    const today = truncate(now, 'day')
    const monthAgo = today - 29 * DAY
    const paid = paidByTime
    const recent = purchases.filter((p) => p.created_at >= monthAgo)
    const daily = fill(
      buckets(iso(monthAgo), iso(now), 'day'),
      'day',
      usersByReg,
      (u) => u.registered_at,
      (t) => ({ t: iso(t), new_users: 0, deposits: 0 }),
      (p) => p.new_users++,
    )
    for (const i of paid) {
      if (i.paid_at! < monthAgo) continue
      const idx = Math.floor((truncate(i.paid_at!, 'day') - monthAgo) / DAY)
      if (daily[idx]) daily[idx].deposits = round2(daily[idx].deposits + i.amount)
    }
    return delay({
      users_total: users.length,
      users_today: users.filter((u) => u.registered_at >= today).length,
      users_blocked: users.filter((u) => u.is_blocked_bot && !u.is_bot).length,
      users_bots: users.filter((u) => u.is_bot).length,
      subscriptions_active: [...subscriptions.values()].filter((s) => s.expires_at > now).length,
      deposits_total: sum(paid.map((i) => i.amount)),
      deposits_today: sum(paid.filter((i) => i.paid_at! >= today).map((i) => i.amount)),
      deposits_30d: sum(paid.filter((i) => i.paid_at! >= monthAgo).map((i) => i.amount)),
      purchases_30d_count: recent.length,
      purchases_30d_amount: sum(recent.map((p) => p.total_amount)),
      invoices_unpaid: invoices.filter((i) => i.status === 'UNPAID').length,
      daily,
      latest_users: usersByReg.slice(-6).reverse().map(userRow),
      latest_invoices: invoices.slice(-6).reverse().map(invoiceRow),
    })
  },

  async getUsers(p) {
    let list = users
    if (p.role) list = list.filter((u) => u.role === p.role)
    if (p.flag === 'bot') list = list.filter((u) => u.is_bot)
    if (p.flag === 'blocked') list = list.filter((u) => u.is_blocked_bot)
    if (p.flag === 'premium') list = list.filter((u) => u.is_premium)
    if (p.flag === 'trial') list = list.filter((u) => u.has_used_trial_subscription)
    if (p.flag === 'active_sub') list = list.filter((u) => subStatus(u.id).status === 'ACTIVE')
    const q = p.q?.trim().toLowerCase()
    if (q) {
      list = isNumeric(q)
        ? list.filter((u) => String(u.id).startsWith(q) || String(u.tg_user_id).startsWith(q))
        : list.filter((u) => u.language_code?.startsWith(q))
    }
    const rows = list.map(userRow)
    const sorted = sortList(
      rows,
      {
        registered_at: (r) => r.registered_at,
        id: (r) => r.id,
        tg_user_id: (r) => r.tg_user_id,
        balance: (r) => r.balance,
        subscription_expires_at: (r) => r.subscription_expires_at,
        referrals_count: (r) => r.referrals_count,
      },
      p.sort,
      p.order,
    )
    return delay(paginate(sorted, p))
  },

  async getUser(id) {
    const u = users[id - 1]
    if (!u) throw new ApiError(404, 'Пользователь не найден')
    const sub = subscriptions.get(id)
    const refs = referralsByUser.get(id) ?? []
    const paid = paidOf(id)
    const bought = purchasesByUser.get(id) ?? []
    const referrer = u.referrer_id ? users[u.referrer_id - 1] : null
    const details: AdminUserDetails = {
      ...userRow(u),
      birthday_day: u.birthday_day,
      birthday_month: u.birthday_month,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.expires_at > Date.now() ? 'ACTIVE' : 'DISABLED',
            purchased_at: iso(sub.purchased_at),
            expires_at: iso(sub.expires_at),
            url: `https://sub.vpnhub.app/s/${sub.id.toString(36).padStart(6, 'x')}${u.tg_user_id.toString(36)}`,
            remnawave_short_uuid: `${u.tg_user_id.toString(36)}${sub.id}`,
            auto_renewal: sub.auto_renewal,
            slots: slotsFor(sub),
          }
        : null,
      discount:
        id % 17 === 0
          ? { discount: 0.15, text: 'Скидка 15% за отзыв', expire_at: iso(NOW + 9 * DAY) }
          : null,
      referrer: referrer ? { id: referrer.id, tg_user_id: referrer.tg_user_id } : null,
      ref_link: u.ref_link ? { ...u.ref_link, joined_at: iso(u.registered_at) } : null,
      referral_stats: {
        count: refs.length,
        deposits_total: sum(refs.flatMap((r) => paidOf(r.id).map((i) => i.amount))),
        depositors_count: refs.filter((r) => paidOf(r.id).length > 0).length,
        trial_count: refs.filter((r) => r.has_used_trial_subscription).length,
        active_count: refs.filter((r) => subStatus(r.id).status === 'ACTIVE').length,
        earnings_total: sum((earningsByUser.get(id) ?? []).map((e) => e.amount)),
      },
      finance: {
        deposits_total: sum(paid.map((i) => i.amount)),
        deposits_count: paid.length,
        purchases_total: sum(bought.map((p) => p.total_amount)),
        purchases_count: bought.length,
      },
    }
    return delay(details)
  },

  async getUserReferrals(id, p) {
    const rows: ReferralRow[] = (referralsByUser.get(id) ?? []).map((r) => ({
      id: r.id,
      tg_user_id: r.tg_user_id,
      invited_at: iso(r.registered_at),
      has_used_trial_subscription: r.has_used_trial_subscription,
      is_blocked_bot: r.is_blocked_bot,
      subscription_status: subStatus(r.id).status,
      deposits_total: sum(paidOf(r.id).map((i) => i.amount)),
    }))
    const sorted = sortList(rows, { invited_at: (r) => r.invited_at, deposits_total: (r) => r.deposits_total, id: (r) => r.id }, p.sort, p.order)
    return delay(paginate(sorted, p))
  },

  async getUserLedger(id, p) {
    const rows: LedgerEntry[] = (ledgerByUser.get(id) ?? [])
      .map((l) => ({
        id: l.id,
        entry_type: l.entry_type,
        direction: (['PURCHASE_VPN', 'PURCHASE_ADDITIONAL_DEVICE_SLOTS', 'ADMIN_DEDUCT'].includes(l.entry_type) ? 'OUT' : 'IN') as 'IN' | 'OUT',
        amount: l.amount,
        source_type: l.source_type,
        source_id: l.source_id,
        created_at: iso(l.created_at),
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return delay(paginate(rows, p))
  },

  async adjustBalance(id, req) {
    const u = users[id - 1]
    if (!u) throw new ApiError(404, 'Пользователь не найден')
    if (demoRole() === 'SUPPORT_AGENT') throw new ApiError(403, 'Недостаточно прав')
    if (!(req.amount > 0)) throw new ApiError(422, 'Сумма должна быть больше нуля')
    if (req.direction === 'OUT' && req.amount > u.balance) throw new ApiError(422, 'Нельзя списать больше, чем на балансе')
    u.balance = round2(u.balance + (req.direction === 'IN' ? req.amount : -req.amount))
    const entry: MLedger & { id: number } = {
      id: ++ledgerSeq,
      user_id: id,
      entry_type: req.direction === 'IN' ? 'ADMIN_ADD' : 'ADMIN_DEDUCT',
      amount: req.amount,
      source_type: null,
      source_id: null,
      created_at: Date.now(),
    }
    const list = ledgerByUser.get(id)
    if (list) list.push(entry)
    else ledgerByUser.set(id, [entry])
    return mockApi.getUser(id)
  },

  async getInvoices(p) {
    let list = invoices
    if (p.status) list = list.filter((i) => i.status === p.status)
    if (p.provider) list = list.filter((i) => i.provider === p.provider)
    if (p.user_id) list = list.filter((i) => i.user_id === Number(p.user_id))
    const q = p.q?.trim().toLowerCase()
    if (q) {
      list = isNumeric(q)
        ? list.filter((i) => String(i.id).startsWith(q) || String(i.user_id) === q || String(users[i.user_id - 1].tg_user_id).startsWith(q))
        : list.filter((i) => i.external_invoice_id.includes(q))
    }
    const sorted = sortList(
      list,
      { created_at: (i) => i.created_at, id: (i) => i.id, amount: (i) => i.amount, paid_at: (i) => i.paid_at },
      p.sort,
      p.order,
    )
    const page = paginate(sorted, p)
    return delay({ ...page, items: page.items.map(invoiceRow) })
  },

  async getPaymentMethods() {
    return delay([...paymentMethods].sort((a, b) => a.sequence_number - b.sequence_number))
  },

  async updatePaymentMethod(id, patch) {
    if (demoRole() === 'SUPPORT_AGENT') throw new ApiError(403, 'Недостаточно прав')
    const m = paymentMethods.find((x) => x.id === id)
    if (!m) throw new ApiError(404, 'Платёжная система не найдена')
    if (patch.name !== undefined && !patch.name.trim()) throw new ApiError(422, 'Название не может быть пустым')
    Object.assign(m, patch, patch.name ? { name: patch.name.trim() } : {})
    return delay(m)
  },

  async getSettings() {
    return delay(settings)
  },

  async updateSettings(patch) {
    if (demoRole() === 'SUPPORT_AGENT') throw new ApiError(403, 'Недостаточно прав')
    Object.assign(settings, patch, { updated_at: iso(Date.now()) })
    return delay(settings)
  },

  async getStatsRange() {
    return delay({ from: iso(Math.max(START, usersByReg[0]?.registered_at ?? START)), to: iso(Date.now()) })
  },

  async getUsersStats(q) {
    const starts = buckets(q.from, q.to, q.granularity)
    const pts = fill<MUser, UsersStatsPoint>(
      starts,
      q.granularity,
      usersByReg,
      (u) => u.registered_at,
      (t) => ({ t: iso(t), total: 0, blocked: 0, bots: 0, new_total: 0, new_blocked: 0, new_bots: 0 }),
      (p, u) => {
        p.new_total++
        if (u.is_bot) p.new_bots++
        else if (u.is_blocked_bot) p.new_blocked++
      },
    )
    pts.forEach((p, i) => {
      const end = next(starts[i], q.granularity)
      p.total = countBefore(regTimes, end)
      p.bots = countBefore(botTimes, end)
      p.blocked = countBefore(blockedTimes, end)
    })
    return delay(pts, 300)
  },

  async getDepositsStats(q) {
    const starts = buckets(q.from, q.to, q.granularity)
    const points = fill<MInvoice, DepositsStatsPoint>(
      starts,
      q.granularity,
      paidByTime,
      (i) => i.paid_at!,
      (t) => ({ t: iso(t), amount: 0, count: 0, by_provider: {} }),
      (p, i) => {
        p.amount = round2(p.amount + i.amount)
        p.count++
        const pr = (p.by_provider[i.provider] ??= { amount: 0, count: 0 })
        pr.amount = round2(pr.amount + i.amount)
        pr.count++
      },
    )
    const total_before = sum(paidByTime.filter((i) => i.paid_at! < (starts[0] ?? 0)).map((i) => i.amount))
    return delay({ total_before, points }, 300)
  },

  async getPurchasesStats(q) {
    const starts = buckets(q.from, q.to, q.granularity)
    return delay(
      fill(
        starts,
        q.granularity,
        purchases,
        (p) => p.created_at,
        (t): PurchasesStatsPoint => ({ t: iso(t), by_kind: {}, slots: 0 }),
        (pt, p) => {
          const k = (pt.by_kind[p.kind] ??= { count: 0, amount: 0 })
          k.count++
          k.amount = round2(k.amount + p.total_amount)
          pt.slots += p.slots
        },
      ),
      300,
    )
  },
}
