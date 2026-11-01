export { rub, date, dateTime, plural, copyText } from '@vpnhub/shared'

/** 12 345 */
export const num = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

/** 12,3 тыс. / 1,2 млн */
export const compact = (n: number) => n.toLocaleString('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Подпись деления оси: коротко, но без потери точности. Деления — круглые числа,
 * поэтому печатаем их точно (до 3 знаков в тыс./млн), иначе на узком
 * диапазоне вышло бы «4,2 млн» на каждом делении. Не влезает — полное число.
 */
export function axisNum(n: number) {
  const a = Math.abs(n)
  const unit = a >= 1e9 ? 1e9 : a >= 1e6 ? 1e6 : a >= 1e3 ? 1e3 : 1
  const milli = (n / unit) * 1000
  if (unit > 1 && Math.abs(milli - Math.round(milli)) > 1e-6) return num(n)
  return n.toLocaleString('ru-RU', { notation: 'compact', maximumFractionDigits: 3 })
}

/** 12,3 тыс. ₽ */
export const rubCompact = (n: number) => (Math.abs(n) >= 10_000 ? `${compact(n)} ₽` : `${num(n)} ₽`)

/** Доля в процентах: 0.1234 → «12,3 %» */
export const percent = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %` : '—'

/** 01.11.2026 — для полей и подписей */
export const dateNum = (d: Date | string | number) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** 1 ноя 2026 */
export const dateShort = (d: Date | string | number) =>
  new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' г.', '').replace('.', '')

/** yyyy-mm-dd в локальном времени — значение для <input type="date"> */
export function toDateInput(ms: number) {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Начало дня yyyy-mm-dd в локальном времени */
export const fromDateInput = (v: string) => new Date(`${v}T00:00:00`).getTime()

/** «через 3 дн.» / «2 ч назад» */
export function relative(d: Date | string) {
  const diff = new Date(d).getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 36e5) return rtf.format(Math.round(diff / 6e4), 'minute')
  if (abs < 864e5) return rtf.format(Math.round(diff / 36e5), 'hour')
  return rtf.format(Math.round(diff / 864e5), 'day')
}
