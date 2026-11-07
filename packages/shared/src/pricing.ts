import type { Tariffs } from './types'

// Цена подписки по тарифам из БД:
//   цена дня × устройства × дни × (1 − скидка за устройства) × (1 − max(персональная, общая))
// Итог считает бэкенд, здесь только предпросмотр.

const round2 = (n: number) => Math.round(n * 100) / 100

/** Последнее правило с порогом ≤ value (правила отсортированы по порогу) */
function stepFor<T>(rules: T[], key: (r: T) => number, value: number): T | undefined {
  return [...rules]
    .sort((a, b) => key(a) - key(b))
    .filter((r) => key(r) <= value)
    .at(-1)
}

/** Цена дня за устройство или null, если тарифа нет: без цены оформлять нельзя, а не «за 0 ₽» */
export function pricePerDeviceDay(t: Tariffs, days: number): number | null {
  const price = stepFor(t.prices, (p) => p.min_days, days)?.price_per_day ?? [...t.prices].sort((a, b) => a.min_days - b.min_days)[0]?.price_per_day
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null
}

export function deviceDiscount(t: Tariffs, devices: number): number {
  return stepFor(t.device_discounts, (d) => d.device_count, devices)?.discount ?? 0
}

export function activeDiscount(t: Tariffs, now = Date.now()): number {
  const personal = t.personal_discount && +new Date(t.personal_discount.expire_at) > now ? t.personal_discount.discount : 0
  return Math.max(personal, t.current_discount)
}

export interface Quote {
  pricePerDay: number
  base: number
  deviceDiscount: number
  discount: number
  total: number
}

/** Расчёт цены или null, если для такого срока нет цены в тарифах */
export function quote(t: Tariffs, devices: number, days: number): Quote | null {
  const pricePerDay = pricePerDeviceDay(t, days)
  if (pricePerDay === null) return null
  const base = pricePerDay * devices * days
  const dd = deviceDiscount(t, devices)
  const disc = activeDiscount(t)
  return {
    pricePerDay,
    base: round2(base),
    deviceDiscount: dd,
    discount: disc,
    total: round2(base * (1 - dd) * (1 - disc)),
  }
}

export interface SlotsQuote {
  /** Цена дня за устройство */
  pricePerDay: number
  /** Дней до конца подписки, за них и платим */
  daysLeft: number
  /** Без скидок */
  base: number
  /** Доплата за новые слоты на оставшийся срок */
  total: number
}

/**
 * Доплата за новые слоты к действующей подписке: стоимость всех слотов минус стоимость текущих
 * на оставшийся срок, так скидка за число устройств считается верно. Итог считает бэкенд, здесь предпросмотр.
 */
export function slotsQuote(t: Tariffs, currentSlots: number, add: number, expiresAt: string, now = Date.now()): SlotsQuote | null {
  const daysLeft = Math.max(1, Math.ceil((+new Date(expiresAt) - now) / 86_400_000))
  const after = quote(t, currentSlots + add, daysLeft)
  const before = quote(t, Math.max(0, currentSlots), daysLeft)
  if (!after || !before) return null
  return {
    pricePerDay: after.pricePerDay,
    daysLeft,
    base: round2(after.pricePerDay * add * daysLeft),
    total: round2(after.total - (currentSlots > 0 ? before.total : 0)),
  }
}
