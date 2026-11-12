import type { PersonalDiscount, Tariffs } from './types'

// Цена подписки по тарифам из БД, как в боте:
//   тариф = цена дня на этот срок (между парами prices - плавно по прямой)
//   × (1 − max(индивидуальная, общая)), до сотых вверх
//   × (1 − скидка за устройства), снова до сотых вверх
//   итог = тариф × устройства × дни
// Скидки ложатся только на тариф (цену дня). Итог считает бэкенд, здесь только предпросмотр.

const round2 = (n: number) => Math.round(n * 100) / 100
/** До сотых вверх, как в боте: 2,805 → 2,81. Погрешность float (1,55 = 1,5500000001) вверх не тянет */
const ceil2 = (n: number) => Math.ceil(Math.round(n * 1e6) / 1e4) / 100

/** Последнее правило с порогом ≤ value (правила отсортированы по порогу) */
function stepFor<T>(rules: T[], key: (r: T) => number, value: number): T | undefined {
  return [...rules]
    .sort((a, b) => key(a) - key(b))
    .filter((r) => key(r) <= value)
    .at(-1)
}

/** Пары «срок - цена дня» из БД по возрастанию срока, только осмысленные */
export function priceTiers(t: Tariffs) {
  return [...t.prices]
    .filter((p) => Number.isFinite(p.min_days) && Number.isFinite(p.price_per_day) && p.price_per_day > 0)
    .sort((a, b) => a.min_days - b.min_days)
}

export function deviceDiscount(t: Tariffs, devices: number): number {
  const d = stepFor(t.device_discounts, (d) => d.device_count, devices)?.discount ?? 0
  // скидка - доля 0..1; мусор из API не должен давать отрицательную цену
  return Number.isFinite(d) ? Math.min(1, Math.max(0, d)) : 0
}

/** Ответ /tariffs похож на тарифы: массивы на месте, числа конечные. Иначе расчёты дали бы NaN */
export function isValidTariffs(t: unknown): t is Tariffs {
  const v = t as Tariffs | null
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
  return (
    !!v &&
    Array.isArray(v.prices) &&
    v.prices.every((p) => num(p?.min_days) && num(p?.price_per_day)) &&
    Array.isArray(v.device_discounts) &&
    v.device_discounts.every((d) => num(d?.device_count) && num(d?.discount)) &&
    num(v.current_discount)
  )
}

const share = (d: unknown) => (typeof d === 'number' && Number.isFinite(d) ? Math.min(1, Math.max(0, d)) : 0)

/**
 * Индивидуальная скидка, если она действует сейчас (без срока - бессрочная).
 * В user_current_discounts она numeric(10,2) процентами (15.00), фронт считает долями (0.15):
 * больше 1 - значит пришли проценты, переводим, чтобы не зависеть от того, как отдаст бэкенд
 */
export function activePersonal(t: Tariffs, now = Date.now()): PersonalDiscount | null {
  const p = t.personal_discount
  if (!p || typeof p.discount !== 'number') return null
  const discount = share(p.discount > 1 ? p.discount / 100 : p.discount)
  if (!(discount > 0)) return null
  return !p.expire_at || +new Date(p.expire_at) > now ? { ...p, discount } : null
}

export function activeDiscount(t: Tariffs, now = Date.now()): number {
  return Math.max(share(activePersonal(t, now)?.discount), share(t.current_discount))
}

export interface Quote {
  /** Цена дня за устройство на этот срок, без скидок */
  pricePerDay: number
  /** Цена дня самой короткой пары (обычно 1 день) - от неё видно, насколько срок удешевил тариф */
  basePricePerDay: number
  /** Тариф со всеми скидками: столько стоит день одного устройства */
  finalPricePerDay: number
  base: number
  deviceDiscount: number
  /** Скидка на тариф: индивидуальная или общая, что больше */
  discount: number
  /** Скидка на тариф - индивидуальная, а не общая акция */
  personal: boolean
  total: number
}

/**
 * Расчёт цены или null, если тарифов нет. Тариф по сроку плавный: при парах 1 дн. - 5 ₽ и 30 дн. - 4 ₽
 * каждый день срока дешевле на (5 − 4) / 29 ≈ 0,03 ₽
 */
export function quote(t: Tariffs, devices: number, days: number): Quote | null {
  const tiers = priceTiers(t)
  const pricePerDay = interpolatedPricePerDay(t, days)
  if (pricePerDay === null || !tiers.length || !(days > 0) || !(devices > 0)) return null
  const base = pricePerDay * devices * days
  const dd = deviceDiscount(t, devices)
  const disc = activeDiscount(t)
  const personal = share(activePersonal(t)?.discount)
  // порядок как в боте: сначала скидка на тариф, потом за устройства, после каждой - вверх до сотых
  const finalPricePerDay = ceil2(ceil2(pricePerDay * (1 - disc)) * (1 - dd))
  return {
    pricePerDay: round2(pricePerDay),
    basePricePerDay: tiers[0].price_per_day,
    finalPricePerDay,
    base: round2(base),
    deviceDiscount: dd,
    discount: disc,
    personal: personal > 0 && personal >= share(t.current_discount),
    total: round2(finalPricePerDay * devices * days),
  }
}

/**
 * Цена дня за устройство для дробного срока: между порогами тарифа - плавно по прямой.
 * Как в боте: при ценах 1 дн. - 5 ₽ и 10 дн. - 4,5 ₽ срок 2 дн. 23 ч стоит 4,89 ₽.
 * Короче первого порога - цена первого, дольше последнего - цена последнего
 */
export function interpolatedPricePerDay(t: Tariffs, days: number): number | null {
  const ps = priceTiers(t)
  if (!ps.length) return null
  if (days <= ps[0].min_days) return ps[0].price_per_day
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1]
    const b = ps[i]
    if (days <= b.min_days) return a.price_per_day + ((b.price_per_day - a.price_per_day) * (days - a.min_days)) / (b.min_days - a.min_days)
  }
  return ps[ps.length - 1].price_per_day
}

export interface SlotsQuote {
  /** Тариф за день за устройство без скидки, на оставшийся срок */
  basePricePerDay: number
  /** Тариф со скидкой за число устройств */
  pricePerDay: number
  /** Скидка за число устройств после покупки, доля 0..1 */
  deviceDiscount: number
  /** Сколько устройств будет после покупки - от него скидка */
  devicesAfter: number
  /** Остаток подписки в днях, дробный: 2 дн. 12 ч = 2.5 */
  daysLeft: number
  /** Без скидки */
  base: number
  /** К оплате */
  total: number
}

/**
 * Докупка слотов к действующей подписке, как в боте:
 *   остаток срока в днях (дробный) × тариф × (1 − скидка за устройства после покупки) × новые слоты.
 * Тариф берётся на остаток срока, скидка уменьшает тариф. Итог считает бэкенд, здесь предпросмотр.
 */
export function slotsQuote(t: Tariffs, currentSlots: number, add: number, expiresAt: string, now = Date.now()): SlotsQuote | null {
  // точный остаток: округлять до сотых до расчёта нельзя - за минуты до конца он стал бы нулём, а цена поплыла бы
  const exactDays = (+new Date(expiresAt) - now) / 86_400_000
  if (!Number.isFinite(exactDays) || exactDays <= 0 || !Number.isInteger(add) || add < 1) return null
  const basePrice = interpolatedPricePerDay(t, exactDays)
  if (basePrice === null) return null
  const devicesAfter = Math.max(0, currentSlots) + add
  const dd = deviceDiscount(t, devicesAfter)
  const basePricePerDay = round2(basePrice)
  const pricePerDay = ceil2(basePrice * (1 - dd))
  return {
    basePricePerDay,
    pricePerDay,
    deviceDiscount: dd,
    devicesAfter,
    // для показа - до сотых, но не «0» в последние минуты
    daysLeft: Math.max(0.01, round2(exactDays)),
    base: round2(exactDays * basePricePerDay * add),
    total: round2(exactDays * pricePerDay * add),
  }
}
