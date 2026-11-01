import type { DeviceSlot, Invoice, Me, PaymentMethod, PublicSettings, Subscription, Tariffs } from '@vpnhub/shared'
import { quote } from '@vpnhub/shared'
import { getTgUser } from '../lib/telegram'
import type { UserApi } from './index'

/*
 * Демо-бэкенд в памяти: та же форма данных, что у настоящего API.
 * Параметры адреса для проверки сценариев:
 *   ?sub=0         — без подписки
 *   ?expires=90    — подписка закончится через 90 секунд (проверка таймера)
 */

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

let subscription: Subscription | null =
  params.get('sub') === '0'
    ? null
    : {
        id: 1,
        status: 'ACTIVE',
        purchased_at: iso(Date.now() - 14 * DAY),
        expires_at: iso(Date.now() + (expiresIn > 0 ? expiresIn * 1000 : 16 * DAY + 13.7 * 36e5)),
        url: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
        auto_renewal: { is_enabled: true, days: 30 },
        slots: [
          slot(1, 'macOS', 'MacBook', '26.7', 'Happ/5.3.0', 14),
          slot(2, 'iOS', 'iPhone 17 Pro', '26.6', 'Happ/5.3.0', 13),
          slot(3, 'Android', 'Pixel 10', '17', 'v2rayNG/1.10.8', 9),
          slot(4, 'Windows', 'Desktop PC', '11 24H2', 'Hiddify/2.5.7', 5),
          slot(5, 'Linux', 'ThinkPad X1', 'Ubuntu 26.04', 'Clash.Meta/1.19.4', 2),
        ],
      }

const tariffs: Tariffs = {
  prices: [{ min_days: 1, price_per_day: 5 }],
  device_discounts: [],
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

const invoices = new Map<number, Invoice & { payAt: number }>()
let invoiceSeq = 1000

function requireSub(): Subscription {
  if (!subscription) throw new Error('Подписки нет')
  return subscription
}

/** Ручки для тестовой страницы: включить/выключить подписку в демо. */
export const mockControls = {
  hasSubscription: () => subscription?.status === 'ACTIVE',
  /** Подписка закончится через `sec` секунд (проверка таймера и автопродления) */
  expireIn(sec: number) {
    this.setHasSubscription(true)
    subscription!.expires_at = iso(Date.now() + sec * 1000)
  },
  /** Задать баланс (проверка «хватает ли средств на автопродление») */
  setBalance(v: number) {
    me = { ...me, balance: v }
  },
  balance: () => me.balance,
  setHasSubscription(v: boolean) {
    if (!v) subscription = null
    else if (subscription?.status !== 'ACTIVE') {
      subscription = {
        id: 1,
        status: 'ACTIVE',
        purchased_at: now(),
        expires_at: iso(Date.now() + 30 * DAY),
        url: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
        auto_renewal: { is_enabled: true, days: 30 },
        slots: [slot(1, 'iOS', 'iPhone 17 Pro', '26.6', 'Happ/5.3.0', 0)],
      }
    }
  },
}

export const mockApi: UserApi = {
  loginTelegram: (req) => {
    me = { ...me, tg_user_id: req.id }
    return delay({ token: `mock-${req.id}` }, 600)
  },
  getMe: () => delay(me),
  getSubscription() {
    // истекла: автопродление с баланса, если хватает денег, иначе — отключение
    if (subscription?.status === 'ACTIVE' && +new Date(subscription.expires_at) <= Date.now()) {
      const { is_enabled, days } = subscription.auto_renewal
      const { total } = quote(tariffs, subscription.slots.length, days)
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

  async createInvoice({ provider, amount }) {
    const inv: Invoice & { payAt: number } = {
      id: ++invoiceSeq,
      user_id: me.id,
      provider,
      amount,
      selected_currency: 'RUB',
      status: 'UNPAID',
      created_at: now(),
      updated_at: null,
      external_invoice_id: null,
      pay_url: null,
      paid_at: null,
      payAt: Date.now() + 1500, // «оплата» проходит через полторы секунды
    }
    invoices.set(inv.id, inv)
    return delay(inv, 400)
  },

  async getInvoice(id) {
    const inv = invoices.get(id)
    if (!inv) throw new Error('Счёт не найден')
    if (inv.status === 'UNPAID' && Date.now() >= inv.payAt) {
      inv.status = 'PAID'
      inv.paid_at = inv.updated_at = now()
      me = { ...me, balance: me.balance + inv.amount }
    }
    return delay(inv)
  },

  async purchase({ days, devices }) {
    const { total } = quote(tariffs, devices, days)
    if (total > me.balance) throw new Error('Недостаточно средств на балансе')
    me = { ...me, balance: me.balance - total }
    const base = subscription && +new Date(subscription.expires_at) > Date.now() ? +new Date(subscription.expires_at) : Date.now()
    subscription = {
      id: 1,
      status: 'ACTIVE',
      purchased_at: now(),
      expires_at: iso(base + days * DAY),
      url: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
      auto_renewal: subscription?.auto_renewal ?? { is_enabled: true, days: 30 },
      slots: Array.from({ length: devices }, (_, i) => emptySlot(i + 1)),
    }
    return delay(subscription, 500)
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
    if (sub.slots.length > 1) sub.slots = sub.slots.filter((x) => x.id !== id)
    await delay(null)
  },
}
