import type { Article, DeviceSlot, Invoice, Me, PaymentMethod, PublicSettings, Subscription, Tariffs } from '@vpnhub/shared'
import { mockArticles, quote, slotsQuote } from '@vpnhub/shared'
import { getTgUser } from '../lib/telegram'
import { MAX_DEVICES } from '../data/content'
import type { UserApi } from './index'

// Тестовый бэкенд в памяти, данные той же формы, что у настоящего API.
// Для проверки: ?sub=0 - без подписки, ?sub=expired - подписка истекла (устройства остались),
// ?expires=90 - подписка кончится через 90 с.

const params = new URLSearchParams(location.search)
const DAY = 864e5
const now = () => new Date().toISOString()
const iso = (ms: number) => new Date(ms).toISOString()
const delay = <T>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms))

let me: Me = {
  id: 104857,
  tg_user_id: getTgUser()?.id ?? 5_812_334_097,
  registered_at: iso(Date.now() - 40 * DAY),
  language_code: 'ru',
  has_used_trial_subscription: true,
  is_premium: false,
  role: 'USER',
  balance: 450,
  email: null,
}

const slot = (id: number, platform: string, model: string, version_os: string, agent: string, daysAgo: number): DeviceSlot => ({
  id,
  hwid: `hw-${id}`,
  agent,
  model,
  platform,
  version_os,
  is_occupied: true,
  is_sellable: true,
  first_connection_at: iso(Date.now() - daysAgo * DAY),
  updated_at: now(),
})

const FREE: Partial<DeviceSlot> = { is_occupied: false, hwid: null, agent: null, model: null, platform: null, version_os: null, first_connection_at: null }
const emptySlot = (id: number): DeviceSlot => ({ ...slot(id, '', '', '', '', 0), ...FREE })

const expiresIn = Number(params.get('expires'))

const DEMO_DEVICES = [
  ['macOS', 'MacBook', '26.7', 'Happ/5.3.0', 14],
  ['iOS', 'iPhone 17 Pro', '26.6', 'Happ/5.3.0', 13],
  ['Android', 'Pixel 10', '17', 'v2rayNG/1.10.8', 9],
  ['Windows', 'Desktop PC', '11 24H2', 'Hiddify/2.5.7', 5],
  ['Linux', 'ThinkPad X1', 'Ubuntu 26.04', 'Clash.Meta/1.19.4', 2],
]

const DEMO_SLOTS = () => [
  slot(1, 'macOS', 'MacBook', '26.7', 'Happ/5.3.0', 14),
  slot(2, 'iOS', 'iPhone 17 Pro', '26.6', 'Happ/5.3.0', 13),
  slot(3, 'Android', 'Pixel 10', '17', 'v2rayNG/1.10.8', 9),
  slot(4, 'Windows', 'Desktop PC', '11 24H2', 'Hiddify/2.5.7', 5),
  slot(5, 'Linux', 'ThinkPad X1', 'Ubuntu 26.04', 'Clash.Meta/1.19.4', 2),
]

const demoSubscription = (expiresInMs = 16 * DAY + 13.7 * 36e5): Subscription => ({
  id: 1,
  status: 'ACTIVE',
  purchased_at: iso(Date.now() - 14 * DAY),
  expires_at: iso(Date.now() + expiresInMs),
  url: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
  auto_renewal: { is_enabled: true, days: 30 },
  slots: DEMO_SLOTS(),
})

let subscription: Subscription | null =
  params.get('sub') === '0'
    ? null
    : params.get('sub') === 'expired'
      ? {
          ...demoSubscription(-DAY),
          status: 'DISABLED',
          auto_renewal: { is_enabled: false, days: 30 },
          slots: [...DEMO_SLOTS(), ...[6, 7, 8, 9, 10, 11].map(emptySlot)],
        }
      : demoSubscription(expiresIn > 0 ? expiresIn * 1000 : undefined)

const tariffs: Tariffs = {
  // как в боте: цена дня по сроку и скидка за число устройств
  prices: [
    { min_days: 1, price_per_day: 5 },
    { min_days: 10, price_per_day: 4.5 },
    { min_days: 30, price_per_day: 3.3 },
    { min_days: 90, price_per_day: 2.76 },
  ],
  device_discounts: [
    { device_count: 2, discount: 0.05 },
    { device_count: 3, discount: 0.1 },
    { device_count: 4, discount: 0.15 },
    { device_count: 5, discount: 0.2 },
    { device_count: 6, discount: 0.25 },
    { device_count: 7, discount: 0.35 },
    { device_count: 8, discount: 0.4 },
    { device_count: 9, discount: 0.45 },
    { device_count: 10, discount: 0.5 },
  ],
  current_discount: 0,
  personal_discount: null,
}

const methods: PaymentMethod[] = [
  { id: 1, name: 'Банковская карта', provider: 'yookassa', tg_emoji_id: null, sequence_number: 1, min_amount: 50, is_active: true },
  { id: 2, name: 'Telegram Stars', provider: 'tg_stars', tg_emoji_id: null, sequence_number: 2, min_amount: 50, is_active: true },
  { id: 3, name: 'Криптовалюта', provider: 'cryptobot', tg_emoji_id: null, sequence_number: 3, min_amount: 100, is_active: true },
  { id: 4, name: 'СБП', provider: 'WATA', tg_emoji_id: null, sequence_number: 4, min_amount: 50, is_active: true },
]

const settings: PublicSettings = { support_link: 'https://t.me/vpnhub_support', invited_bonus: 30, referral_bonus: 30 }

// Счета. Оплата - страница-заглушка /test-pay в новой вкладке: она пишет итог в localStorage,
// кабинет видит его при следующем опросе счёта.

const PAY_KEY = 'vpnhub.test-pay'
const invoices = new Map<number, Invoice>()
// номера от времени запуска: итоги оплат в localStorage не путаются между перезагрузками
let invoiceSeq = Math.floor(Date.now() / 1000) % 10_000_000

const payUrl = (id: number, amount: number) => `${location.origin}${import.meta.env.BASE_URL}test-pay?invoice=${id}&amount=${amount}`

function addInvoice(provider: Invoice['provider'], amount: number, createdAt = now()) {
  const id = ++invoiceSeq
  const inv: Invoice = {
    id,
    user_id: me.id,
    provider,
    amount,
    selected_currency: 'RUB',
    status: 'UNPAID',
    created_at: createdAt,
    updated_at: null,
    external_invoice_id: `test-${id}`,
    pay_url: payUrl(id, amount),
    paid_at: null,
  }
  invoices.set(id, inv)
  return inv
}

// несколько старых неоплаченных счетов, чтобы было видно раздел и кнопку «Показать ещё» (?unpaid=0 - без них)
function seedInvoices() {
  addInvoice('yookassa', 300, iso(Date.now() - 26 * 3600_000))
  addInvoice('cryptobot', 1000, iso(Date.now() - 5 * 3600_000))
  addInvoice('WATA', 750, iso(Date.now() - 3 * 3600_000))
  addInvoice('tg_stars', 200, iso(Date.now() - 2 * 3600_000))
  addInvoice('yookassa', 500, iso(Date.now() - 40 * 60_000))
}
if (params.get('unpaid') !== '0') seedInvoices()

/** Итог тестовой оплаты из соседней вкладки */
export function setTestPayResult(id: number, status: 'PAID' | 'FAILED') {
  try {
    const all = JSON.parse(localStorage.getItem(PAY_KEY) || '{}')
    localStorage.setItem(PAY_KEY, JSON.stringify({ ...all, [id]: status }))
  } catch {
    /* хранилище недоступно */
  }
}

function syncInvoice(inv: Invoice) {
  if (inv.status !== 'UNPAID') return
  let result: string | undefined
  try {
    result = JSON.parse(localStorage.getItem(PAY_KEY) || '{}')[inv.id]
  } catch {
    return
  }
  if (result === 'PAID') {
    inv.status = 'PAID'
    inv.paid_at = inv.updated_at = now()
    me = { ...me, balance: me.balance + inv.amount }
  } else if (result === 'FAILED') {
    inv.status = 'FAILED'
    inv.updated_at = now()
  }
}

/** Цена как на бэкенде: без тарифа покупка отклоняется */
function mustQuote(...args: Parameters<typeof quote>) {
  const q = quote(...args)
  if (!q) throw new Error('Тариф недоступен, попробуйте позже')
  return q.total
}

function requireSub(): Subscription {
  if (!subscription) throw new Error('Подписки нет')
  return subscription
}

export const mockApi: UserApi = {
  loginTelegram: (req) => {
    me = { ...me, tg_user_id: req.id }
    return delay({ token: `mock-${req.id}` }, 600)
  },
  getMe: () => delay(me),
  bindEmail: async (email) => {
    me = { ...me, email }
    return delay(me)
  },
  getSubscription() {
    // истекла: продлеваем с баланса, если хватает, иначе отключаем
    if (subscription?.status === 'ACTIVE' && +new Date(subscription.expires_at) <= Date.now()) {
      const { is_enabled, days } = subscription.auto_renewal
      const total = mustQuote(tariffs, subscription.slots.length, days)
      if (is_enabled && total <= me.balance) {
        me = { ...me, balance: me.balance - total }
        subscription.expires_at = iso(Date.now() + days * DAY)
      } else subscription.status = 'DISABLED'
    }
    return delay(subscription)
  },
  getTariffs: () => delay(tariffs),
  getPaymentMethods: () => delay(methods.filter((m) => m.is_active).sort((a, b) => a.sequence_number - b.sequence_number)),
  getSettings: () => delay(settings),
  getArticles: () =>
    delay(
      mockArticles
        .load()
        .filter((a: Article) => a.is_active)
        .sort((a: Article, b: Article) => a.sequence_number - b.sequence_number),
    ),

  // как советуем бэкенду (docs/api.txt): тот же неоплаченный счёт на ту же сумму тем же способом не дублируем
  createInvoice({ provider, amount }) {
    invoices.forEach(syncInvoice)
    const same = [...invoices.values()].find((i) => i.status === 'UNPAID' && i.provider === provider && i.amount === amount)
    return delay(same ?? addInvoice(provider, amount), 400)
  },

  async getInvoice(id) {
    const inv = invoices.get(id)
    if (!inv) throw new Error('Счёт не найден')
    syncInvoice(inv)
    return delay(inv)
  },

  async getUnpaidInvoices() {
    invoices.forEach(syncInvoice)
    const list = [...invoices.values()].filter((i) => i.status === 'UNPAID').sort((a, b) => b.id - a.id)
    return delay(list)
  },

  async purchase({ days, devices }) {
    const total = mustQuote(tariffs, devices, days)
    if (total > me.balance) throw new Error('Недостаточно средств на балансе')
    me = { ...me, balance: me.balance - total }
    const base = subscription && +new Date(subscription.expires_at) > Date.now() ? +new Date(subscription.expires_at) : Date.now()
    // как на бэкенде: привязанные устройства остаются, недостающие слоты добавляются пустыми
    const kept = (subscription?.slots ?? []).slice(0, devices)
    const nextId = Math.max(0, ...kept.map((s) => s.id)) + 1
    subscription = {
      id: 1,
      status: 'ACTIVE',
      purchased_at: now(),
      expires_at: iso(base + days * DAY),
      url: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
      auto_renewal: subscription?.auto_renewal ?? { is_enabled: true, days: 30 },
      slots: [...kept, ...Array.from({ length: devices - kept.length }, (_, i) => emptySlot(nextId + i))],
    }
    return delay(subscription, 500)
  },

  async renew(days) {
    const sub = requireSub()
    const total = mustQuote(tariffs, sub.slots.length, days)
    if (total > me.balance) throw new Error('Недостаточно средств на балансе')
    me = { ...me, balance: me.balance - total }
    sub.expires_at = iso(Math.max(Date.now(), +new Date(sub.expires_at)) + days * DAY)
    return delay({ ...sub }, 500)
  },

  async buySlots(count) {
    const sub = requireSub()
    // как на бэке: не больше 1000 устройств в подписке
    if (!Number.isInteger(count) || count < 1 || sub.slots.length + count > MAX_DEVICES)
      throw new Error(`В подписке может быть не больше ${MAX_DEVICES} устройств`)
    const q = slotsQuote(tariffs, sub.slots.length, count, sub.expires_at)
    if (!q) throw new Error('Тариф недоступен, попробуйте позже')
    if (q.total > me.balance) throw new Error('Недостаточно средств на балансе')
    me = { ...me, balance: me.balance - q.total }
    const nextId = Math.max(0, ...sub.slots.map((s) => s.id)) + 1
    sub.slots = [...sub.slots, ...Array.from({ length: count }, (_, i) => emptySlot(nextId + i))]
    return delay({ ...sub }, 500)
  },

  async setAutoRenewal(v) {
    requireSub().auto_renewal = v
    return delay(v)
  },

  async releaseSlot(id) {
    const s = requireSub().slots.find((x) => x.id === id)
    if (s) Object.assign(s, FREE)
    await delay(null)
  },

  async deleteSlot(id) {
    const sub = requireSub()
    if (sub.slots.length <= 1) throw new Error('Последний слот удалить нельзя, его можно только освободить')
    sub.slots = sub.slots.filter((x) => x.id !== id)
    await delay(null)
  },
}

/** Панель состояний (components/StatesPanel): меняет тестовые данные на лету, чтобы посмотреть разные экраны */
export const demoState = {
  get() {
    const unpaid = [...invoices.values()].filter((i) => i.status === 'UNPAID').length
    return {
      hasSub: subscription?.status === 'ACTIVE',
      expired: subscription?.status === 'DISABLED' && subscription.slots.length > 0,
      autoRenew: subscription?.auto_renewal.is_enabled ?? false,
      balance: me.balance,
      unpaid: unpaid > 0,
      occupied: subscription?.slots.filter((s) => s.is_occupied).length ?? 0,
      total: subscription?.slots.length ?? 0,
    }
  },
  setSub(on: boolean) {
    subscription = on ? demoSubscription() : null
  },
  /** сколько осталось; 0 - подписка истекла */
  setExpires(ms: number) {
    if (!subscription || subscription.status !== 'ACTIVE') subscription = demoSubscription()
    if (ms > 0) subscription.expires_at = iso(Date.now() + ms)
    else {
      subscription.expires_at = iso(Date.now() - DAY)
      subscription.status = 'DISABLED'
    }
  },
  setAutoRenew(on: boolean) {
    if (subscription) subscription.auto_renewal = { ...subscription.auto_renewal, is_enabled: on }
  },
  setBalance(v: number) {
    me = { ...me, balance: v }
  },
  setUnpaid(on: boolean) {
    for (const [id, inv] of invoices) if (inv.status === 'UNPAID') invoices.delete(id)
    if (on) seedInvoices()
  },
  /** сколько слотов занято из имеющихся */
  setOccupied(n: number) {
    if (!subscription) return
    subscription.slots.forEach((s, i) => {
      if (i < n && !s.is_occupied) Object.assign(s, slot(s.id, ...(DEMO_DEVICES[i % DEMO_DEVICES.length] as [string, string, string, string, number])))
      if (i >= n) Object.assign(s, FREE)
    })
  },
  /** сколько всего слотов в подписке: лишние убираются с конца, недостающие добавляются пустыми */
  setSlots(total: number) {
    if (!subscription) return
    const s = subscription.slots
    subscription.slots = total <= s.length ? s.slice(0, total) : [...s, ...Array.from({ length: total - s.length }, (_, i) => emptySlot(s.length + i + 1))]
  },
}
