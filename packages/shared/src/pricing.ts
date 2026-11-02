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

export function pricePerDeviceDay(t: Tariffs, days: number): number {
  return stepFor(t.prices, (p) => p.min_days, days)?.price_per_day ?? t.prices[0]?.price_per_day ?? 0
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

export function quote(t: Tariffs, devices: number, days: number): Quote {
  const pricePerDay = pricePerDeviceDay(t, days)
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
