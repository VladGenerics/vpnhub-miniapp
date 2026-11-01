import type {
  DeviceSlot,
  InvoiceStatus,
  LedgerEntryType,
  PaymentMethod,
  PaymentProvider,
  PurchaseKind,
  UserRole,
} from '@vpnhub/shared'

/*
 * Генератор демо-базы: ~14 месяцев жизни сервиса. Детерминированный (seed),
 * поэтому цифры не прыгают между перезагрузками в пределах одного дня.
 * Логика повторяет схему БД: пользователи → счета → покупки → кошелёк.
 */

export const DAY = 864e5
const HISTORY_DAYS = 420

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20261101)
const pick = <T>(items: readonly (readonly [T, number])[]): T => {
  let r = rnd() * items.reduce((s, [, w]) => s + w, 0)
  for (const [v, w] of items) if ((r -= w) <= 0) return v
  return items[items.length - 1][0]
}
const round2 = (n: number) => Math.round(n * 100) / 100

/* ---------- Сущности демо-базы (время — в мс) ---------- */

export interface MUser {
  id: number
  tg_user_id: number
  registered_at: number
  language_code: string | null
  has_used_trial_subscription: boolean
  is_bot: boolean
  is_blocked_bot: boolean
  /** Когда заблокировал бота. В настоящей схеме этого поля нет — см. вопросы в README */
  blocked_at: number | null
  is_premium: boolean
  role: UserRole
  birthday_day: number | null
  birthday_month: number | null
  referrer_id: number | null
  ref_link: { code: string; description: string } | null
  balance: number
}

export interface MInvoice {
  id: number
  user_id: number
  provider: PaymentProvider
  amount: number
  status: InvoiceStatus
  created_at: number
  paid_at: number | null
  external_invoice_id: string
}

export interface MPurchase {
  id: number
  user_id: number
  subscription_id: number
  kind: PurchaseKind
  days: number
  device_quantity: number
  slots: number
  total_amount: number
  created_at: number
}

export interface MSubscription {
  id: number
  user_id: number
  purchased_at: number
  expires_at: number
  devices: number
  auto_renewal: { is_enabled: boolean; days: number }
}

export interface MLedger {
  user_id: number
  entry_type: LedgerEntryType
  amount: number
  source_type: 'INVOICE' | 'PURCHASE' | null
  source_id: number | null
  created_at: number
}

export interface MEarning {
  user_id: number
  amount: number
  reason: 'BONUS_FROM_INVITE' | 'BONUS_FROM_REFERRAL_FILL_BALANCE'
  created_at: number
}

/* ---------- Справочники ---------- */

export const settings = {
  support_link: 'https://t.me/vpnhub_support',
  invited_bonus: 30,
  referral_bonus: 30,
  updated_at: null as string | null,
}

export const paymentMethods: PaymentMethod[] = [
  { id: 1, name: 'Банковская карта', provider: 'yookassa', tg_emoji_id: null, sequence_number: 1, min_amount: 50, is_active: true },
  { id: 2, name: 'Telegram Stars', provider: 'tg_stars', tg_emoji_id: null, sequence_number: 2, min_amount: 50, is_active: true },
  { id: 3, name: 'Криптовалюта', provider: 'cryptobot', tg_emoji_id: null, sequence_number: 3, min_amount: 100, is_active: true },
  { id: 4, name: 'СБП', provider: 'WATA', tg_emoji_id: null, sequence_number: 4, min_amount: 50, is_active: true },
  { id: 5, name: 'Heleket', provider: 'heleket', tg_emoji_id: null, sequence_number: 5, min_amount: 100, is_active: true },
  { id: 6, name: 'LOLZ', provider: 'lolz', tg_emoji_id: null, sequence_number: 6, min_amount: 100, is_active: false },
  { id: 7, name: 'RollyPay', provider: 'rollypay', tg_emoji_id: null, sequence_number: 7, min_amount: 100, is_active: false },
]

const PROVIDERS = [
  ['yookassa', 45],
  ['tg_stars', 20],
  ['cryptobot', 12],
  ['WATA', 11],
  ['heleket', 6],
  ['lolz', 4],
  ['rollypay', 2],
] as const

const AMOUNTS = [
  [100, 12],
  [150, 9],
  [200, 18],
  [300, 18],
  [500, 20],
  [1000, 12],
  [1500, 4],
  [2000, 4],
  [5000, 2],
] as const

const REF_LINKS = [
  { code: 'tg_ads_oct', description: 'Реклама в Telegram Ads, октябрь' },
  { code: 'yt_review', description: 'Обзор на YouTube' },
  { code: 'channel_post', description: 'Пост в канале проекта' },
  { code: 'promo2026', description: 'Промокампания 2026' },
]

/** Цена дня одного устройства по длительности и скидки за устройства — как в prices / device_count_discounts */
export const PRICES = [
  { min_days: 1, price_per_day: 6 },
  { min_days: 30, price_per_day: 5 },
  { min_days: 90, price_per_day: 4.5 },
  { min_days: 180, price_per_day: 4 },
]
const DEVICE_DISCOUNT: Record<number, number> = { 1: 0, 2: 0.05, 3: 0.1, 4: 0.1, 5: 0.15 }

const pricePerDay = (days: number) => PRICES.filter((p) => p.min_days <= days).at(-1)!.price_per_day
const cost = (days: number, devices: number) => round2(days * devices * pricePerDay(days) * (1 - (DEVICE_DISCOUNT[devices] ?? 0.15)))

/* ---------- Генерация ---------- */

export const NOW = Date.now()
const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
export const START = startOfDay(NOW) - HISTORY_DAYS * DAY

export const users: MUser[] = []
export const invoices: MInvoice[] = []
export const purchases: MPurchase[] = []
export const subscriptions = new Map<number, MSubscription>()
export const ledger: MLedger[] = []
export const earnings: MEarning[] = []

function generate() {
  const tgIds = new Set<number>()
  const influencers: number[] = []
  let invoiceId = 1
  let purchaseId = 1
  let subId = 1

  for (let d = 0; d <= HISTORY_DAYS; d++) {
    const progress = d / HISTORY_DAYS
    const base = 3 + 24 * progress ** 1.5
    const weekly = 1 + 0.2 * Math.sin((2 * Math.PI * (d % 7)) / 7)
    const campaign = rnd() < 0.035 ? 2.6 : 1
    const count = Math.round(base * weekly * campaign * (0.7 + 0.6 * rnd()))

    // время регистраций внутри дня — по возрастанию, чтобы id шли в порядке регистрации, как в базе
    const times = Array.from({ length: count }, () => START + d * DAY + Math.floor(rnd() * DAY)).sort((a, b) => a - b)
    for (const registered_at of times) {
      if (registered_at > NOW) continue
      const id = users.length + 1
      let tg = 0
      do tg = 5_000_000_000 + Math.floor(rnd() * 2_400_000_000)
      while (tgIds.has(tg))
      tgIds.add(tg)

      const is_bot = rnd() < 0.035
      const blocked = rnd() < (is_bot ? 0.55 : 0.07 + 0.13 * (1 - progress))
      const referrer =
        users.length > 50 && rnd() < 0.28
          ? influencers.length && rnd() < 0.55
            ? influencers[Math.floor(rnd() * influencers.length)]
            : 1 + Math.floor(rnd() * users.length)
          : null
      const user: MUser = {
        id,
        tg_user_id: tg,
        registered_at,
        language_code: pick([
          ['ru', 72],
          ['en', 12],
          ['uk', 8],
          ['kk', 4],
          [null, 4],
        ] as const),
        has_used_trial_subscription: !is_bot && rnd() < 0.6,
        is_bot,
        is_blocked_bot: blocked,
        blocked_at: blocked ? registered_at + Math.floor(rnd() * (NOW - registered_at)) : null,
        is_premium: rnd() < 0.14,
        role: id === 1 ? 'OWNER' : id <= 3 ? 'ADMIN' : id === 4 ? 'SUPPORT_AGENT' : 'USER',
        birthday_day: rnd() < 0.3 ? 1 + Math.floor(rnd() * 28) : null,
        birthday_month: null,
        referrer_id: referrer,
        ref_link: !referrer && rnd() < 0.15 ? REF_LINKS[Math.floor(rnd() * REF_LINKS.length)] : null,
        balance: 0,
      }
      if (user.birthday_day) user.birthday_month = 1 + Math.floor(rnd() * 12)
      users.push(user)
      if (influencers.length < 60 && !is_bot && rnd() < 0.04) influencers.push(id)
      if (!is_bot) simulate(user)
    }
  }

  /** Жизнь пользователя: пополнения, покупки, автопродления */
  function simulate(u: MUser) {
    let balance = 0
    if (u.referrer_id) {
      balance += settings.invited_bonus
      ledger.push({ user_id: u.id, entry_type: 'INIT_BALANCE', amount: settings.invited_bonus, source_type: null, source_id: null, created_at: u.registered_at })
      earnings.push({ user_id: u.referrer_id, amount: settings.referral_bonus, reason: 'BONUS_FROM_INVITE', created_at: u.registered_at })
    }

    // попытки оплаты: первая — в первые дни, дальше — с интервалами
    const payer = rnd() < (u.is_blocked_bot ? 0.3 : 0.62)
    const times: number[] = []
    if (payer) {
      let t = u.registered_at + rnd() ** 2 * 5 * DAY
      while (t < NOW) {
        times.push(t)
        t += (8 + rnd() * 50) * DAY
        if (rnd() < 0.18) break
      }
    }

    // объявлено через as: иначе TS «запоминает» null и не видит присваивания внутри buy()
    let sub = null as MSubscription | null
    let firstPurchase = true
    const autorenew = rnd() < 0.7
    const devices = pick([
      [1, 60],
      [2, 24],
      [3, 10],
      [5, 6],
    ] as const)

    const buy = (kind: PurchaseKind, at: number, days: number, devs: number, slots = 0) => {
      const total = slots ? round2(slots * days * pricePerDay(days)) : cost(days, devs)
      if (total > balance) return false
      balance = round2(balance - total)
      if (!sub) {
        sub = { id: subId++, user_id: u.id, purchased_at: at, expires_at: at, devices: devs, auto_renewal: { is_enabled: autorenew, days: 30 } }
        subscriptions.set(u.id, sub)
      }
      const p: MPurchase = {
        id: purchaseId++,
        user_id: u.id,
        subscription_id: sub.id,
        kind,
        days,
        device_quantity: devs + slots,
        slots,
        total_amount: total,
        created_at: at,
      }
      purchases.push(p)
      ledger.push({
        user_id: u.id,
        entry_type: slots ? 'PURCHASE_ADDITIONAL_DEVICE_SLOTS' : 'PURCHASE_VPN',
        amount: total,
        source_type: 'PURCHASE',
        source_id: p.id,
        created_at: at,
      })
      if (slots) sub.devices += slots
      else sub.expires_at = Math.max(sub.expires_at, at) + days * DAY
      return true
    }

    /** Автопродления до момента until, пока хватает денег */
    const renewUntil = (until: number) => {
      while (sub && autorenew && sub.expires_at < until && sub.expires_at < NOW) {
        if (!buy('VPN_AUTORENEWAL', sub.expires_at, 30, sub.devices)) break
      }
    }

    for (const t of times) {
      renewUntil(t)
      const amount = pick(AMOUNTS)
      const recent = NOW - t < 2 * 36e5
      const status: InvoiceStatus = recent && rnd() < 0.5 ? 'UNPAID' : pick([['PAID', 79], ['EXPIRED', 14], ['FAILED', 7]] as const)
      const inv: MInvoice = {
        id: invoiceId++,
        user_id: u.id,
        provider: pick(PROVIDERS),
        amount,
        status,
        created_at: t,
        paid_at: status === 'PAID' ? t + 30_000 + Math.floor(rnd() * 600_000) : null,
        external_invoice_id: `${Math.floor(rnd() * 36 ** 6).toString(36)}-${(invoiceId * 7919).toString(36)}`,
      }
      invoices.push(inv)
      if (status !== 'PAID' || !inv.paid_at) continue

      balance += amount
      ledger.push({ user_id: u.id, entry_type: 'DEPOSIT', amount, source_type: 'INVOICE', source_id: inv.id, created_at: inv.paid_at })
      if (u.referrer_id) earnings.push({ user_id: u.referrer_id, amount: round2(amount * 0.1), reason: 'BONUS_FROM_REFERRAL_FILL_BALANCE', created_at: inv.paid_at })

      const at = inv.paid_at + 60_000 + Math.floor(rnd() * 3_600_000)
      if (at > NOW) continue
      const days = [90, 60, 30, 14, 7].find((d) => cost(d, sub?.devices ?? devices) <= balance && rnd() < 0.75) ?? 7
      const active = !!sub && sub.expires_at > at
      const kind: PurchaseKind = firstPurchase
        ? 'VPN_FIRST_PURCHASE'
        : active
          ? 'VPN_EXTENSION'
          : sub && at - sub.expires_at < 14 * DAY
            ? 'VPN_RENEWAL'
            : 'VPN_PURCHASE'
      if (buy(kind, at, days, sub?.devices ?? devices)) {
        firstPurchase = false
        // иногда докупают слоты устройств на остаток срока
        if (sub && rnd() < 0.09) {
          const left = Math.max(1, Math.round((sub.expires_at - at) / DAY))
          buy('DEVICE_SLOTS', at + 120_000, left, sub.devices, rnd() < 0.7 ? 1 : 2)
        }
      }
    }
    renewUntil(NOW)
    u.balance = balance
  }

  // реферальные бонусы — в кошелёк пригласившего
  for (const e of earnings) {
    const u = users[e.user_id - 1]
    u.balance = round2(u.balance + e.amount)
    ledger.push({
      user_id: e.user_id,
      entry_type: e.reason,
      amount: e.amount,
      source_type: null,
      source_id: null,
      created_at: e.created_at,
    })
  }

  // номера счетов и покупок растут со временем, как у автоинкремента в БД
  invoices.sort((a, b) => a.created_at - b.created_at)
  purchases.sort((a, b) => a.created_at - b.created_at)
  const invoiceIds = new Map(invoices.map((x, i) => [x.id, i + 1]))
  const purchaseIds = new Map(purchases.map((x, i) => [x.id, i + 1]))
  invoices.forEach((x, i) => (x.id = i + 1))
  purchases.forEach((x, i) => (x.id = i + 1))
  for (const l of ledger) {
    if (l.source_type === 'INVOICE') l.source_id = invoiceIds.get(l.source_id!)!
    if (l.source_type === 'PURCHASE') l.source_id = purchaseIds.get(l.source_id!)!
  }
}

generate()

/* ---------- Производные данные ---------- */

const PLATFORMS = [
  ['iOS', 'iPhone 15', '18.1', 'Streisand'],
  ['Android', 'Pixel 8', '15', 'v2rayNG'],
  ['Windows', 'PC', '11', 'Hiddify'],
  ['macOS', 'MacBook Air', '15.1', 'FoXray'],
  ['Android', 'Galaxy S24', '14', 'Hiddify'],
] as const

/** Слоты устройств подписки — строятся при открытии карточки */
export function slotsFor(sub: MSubscription): DeviceSlot[] {
  const r = mulberry32(sub.id)
  return Array.from({ length: sub.devices }, (_, i) => {
    const occupied = i === 0 || r() < 0.6
    const [platform, model, version_os, agent] = PLATFORMS[Math.floor(r() * PLATFORMS.length)]
    const first = sub.purchased_at + Math.floor(r() * Math.max(1, Math.min(NOW, sub.expires_at) - sub.purchased_at))
    return {
      id: sub.id * 10 + i,
      hwid: occupied ? `${(sub.id * 977 + i).toString(16)}-${Math.floor(r() * 1e8).toString(16)}` : null,
      agent: occupied ? agent : null,
      model: occupied ? model : null,
      platform: occupied ? platform : null,
      version_os: occupied ? version_os : null,
      is_occupied: occupied,
      is_sellable: true,
      first_connection_at: occupied ? new Date(first).toISOString() : null,
      updated_at: new Date(first).toISOString(),
    }
  })
}
