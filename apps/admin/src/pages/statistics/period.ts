import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Granularity, StatsQuery } from '@vpnhub/shared'
import { TZ, useStatsRange } from '../../api/queries'

/*
 * Период и шаг статистики. Время — в часовом поясе браузера (его же получает бэкенд в tz),
 * границы интервалов: начало часа / дня / месяца / года.
 * Период живёт в адресе (?g=day&from=2026-10-02&to=2026-11-01), у каждой вкладки свой.
 */

export const HOUR = 36e5
export const DAY = 864e5
/** По часам грузим только последний месяц: за год это 9 тысяч точек, читать их всё равно нельзя */
const HOUR_HISTORY_DAYS = 31

export function truncate(ms: number, g: Granularity) {
  const d = new Date(ms)
  if (g === 'hour') d.setMinutes(0, 0, 0)
  else {
    d.setHours(0, 0, 0, 0)
    if (g !== 'day') d.setDate(1)
    if (g === 'year') d.setMonth(0)
  }
  return d.getTime()
}

export function step(ms: number, g: Granularity, n = 1) {
  const d = new Date(ms)
  if (g === 'hour') d.setHours(d.getHours() + n)
  else if (g === 'day') d.setDate(d.getDate() + n)
  else if (g === 'month') d.setMonth(d.getMonth() + n)
  else d.setFullYear(d.getFullYear() + n)
  return d.getTime()
}

/** Период: from — начало первого интервала, to — конец последнего (не включительно) */
export interface Period {
  from: number
  to: number
}

export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'hour', label: 'Часы' },
  { value: 'day', label: 'Дни' },
  { value: 'month', label: 'Месяцы' },
  { value: 'year', label: 'Годы' },
]

interface Preset {
  label: string
  /** Сколько интервалов шага g назад от текущего; null — вся история */
  count: number | null
}

export const PRESETS: Record<Granularity, Preset[]> = {
  hour: [
    { label: '24 часа', count: 24 },
    { label: '3 дня', count: 72 },
    { label: '7 дней', count: 168 },
  ],
  day: [
    { label: '7 дней', count: 7 },
    { label: '30 дней', count: 30 },
    { label: '90 дней', count: 90 },
    { label: 'Год', count: 365 },
    { label: 'Всё время', count: null },
  ],
  month: [
    { label: '6 месяцев', count: 6 },
    { label: '12 месяцев', count: 12 },
    { label: 'Всё время', count: null },
  ],
  year: [{ label: 'Всё время', count: null }],
}

/** По умолчанию: часы — 3 дня, дни — 30 дней (как в ТЗ), месяцы — год, годы — всё */
const DEFAULT_PRESET: Record<Granularity, number> = { hour: 1, day: 1, month: 1, year: 0 }

export function presetPeriod(p: Preset, g: Granularity, bounds: Period): Period {
  const to = bounds.to
  const from = p.count === null ? bounds.from : Math.max(bounds.from, step(to, g, -p.count))
  return { from, to }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Для адреса: дата, а для часов — дата и время */
function encode(ms: number) {
  const d = new Date(ms)
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return d.getHours() || d.getMinutes() ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}` : day
}

function decode(v: string | null): number | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) return null
  // yyyy-mm-dd без времени new Date читает как UTC — дописываем время, чтобы вышло локальное
  const ms = new Date(v.length === 10 ? `${v}T00:00` : v).getTime()
  return Number.isFinite(ms) ? ms : null
}

/** Подгоняет период под шаг и доступные данные */
export function clampPeriod(p: Period, g: Granularity, bounds: Period): Period {
  let from = Math.max(bounds.from, truncate(p.from, g))
  let to = Math.min(bounds.to, p.to)
  if (to > from && truncate(to, g) !== to) to = Math.min(bounds.to, step(truncate(to, g), g))
  if (to <= from) {
    from = truncate(Math.min(from, bounds.to - 1), g)
    to = Math.min(bounds.to, step(from, g))
  }
  return { from, to }
}

/**
 * Состояние вкладки статистики: шаг, период, границы данных и запрос к API.
 * Пока тянут ползунок шкалы, период меняется мгновенно (метрики пересчитываются на лету),
 * а в адрес записывается с задержкой — история браузера не засоряется.
 */
export function useStatsPeriod() {
  const [sp, setSp] = useSearchParams()
  const range = useStatsRange()
  const g = (GRANULARITIES.some((x) => x.value === sp.get('g')) ? sp.get('g') : 'day') as Granularity
  const [now] = useState(() => Date.now())

  // какие данные загружать: вся история (по часам — последний месяц) до конца текущего интервала
  const bounds = useMemo<Period | null>(() => {
    if (!range.data) return null
    const start = new Date(range.data.from).getTime()
    const from = truncate(g === 'hour' ? Math.max(start, now - HOUR_HISTORY_DAYS * DAY) : start, g)
    return { from, to: step(truncate(now, g), g) }
  }, [range.data, g, now])

  const fromUrl = useMemo<Period | null>(() => {
    const from = decode(sp.get('from'))
    const to = decode(sp.get('to'))
    // в адресе «по» — последний день включительно
    return from !== null && to !== null ? { from, to: g === 'hour' ? to : step(truncate(to, 'day'), 'day') } : null
  }, [sp, g])

  const initial = useCallback(
    (b: Period) => (fromUrl ? clampPeriod(fromUrl, g, b) : presetPeriod(PRESETS[g][DEFAULT_PRESET[g]], g, b)),
    [fromUrl, g],
  )

  const [period, setPeriodState] = useState<Period | null>(null)
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // первый расчёт и смена шага — когда известны границы
  const boundsKey = bounds ? `${g}:${bounds.from}:${bounds.to}` : ''
  const lastKey = useRef('')
  useEffect(() => {
    if (!bounds || lastKey.current === boundsKey) return
    lastKey.current = boundsKey
    setPeriodState(initial(bounds))
  }, [bounds, boundsKey, initial])

  const writeUrl = useCallback(
    (p: Period, nextG: Granularity, immediate = false) => {
      clearTimeout(urlTimer.current)
      const write = () =>
        setSp(
          (prev) => {
            const n = new URLSearchParams(prev)
            n.set('g', nextG)
            n.set('from', encode(p.from))
            n.set('to', encode(nextG === 'hour' ? p.to : step(p.to, 'day', -1)))
            return n
          },
          { replace: true },
        )
      if (immediate) write()
      else urlTimer.current = setTimeout(write, 400)
    },
    [setSp],
  )
  useEffect(() => () => clearTimeout(urlTimer.current), [])

  const setPeriod = useCallback(
    (p: Period, immediate = false) => {
      if (!bounds) return
      const c = clampPeriod(p, g, bounds)
      setPeriodState((cur) => (cur && cur.from === c.from && cur.to === c.to ? cur : c))
      writeUrl(c, g, immediate)
    },
    [bounds, g, writeUrl],
  )

  const setGranularity = useCallback(
    (next: Granularity) => {
      // новый шаг — новый период по умолчанию; границы пересчитаются эффектом выше
      setSp(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.set('g', next)
          n.delete('from')
          n.delete('to')
          return n
        },
        { replace: true },
      )
    },
    [setSp],
  )

  const query = useMemo<StatsQuery | null>(
    () => (bounds ? { from: new Date(bounds.from).toISOString(), to: new Date(bounds.to).toISOString(), granularity: g, tz: TZ } : null),
    [bounds, g],
  )

  // период в state может отставать от шага на один рендер — тогда ещё не готов
  const ready = period && bounds && lastKey.current === boundsKey ? period : null

  return { g, bounds, period: ready, setPeriod, setGranularity, query, rangeError: range.error, refetchRange: range.refetch }
}

/** Точки внутри периода */
export const inPeriod = <T extends { t: string }>(points: T[] | undefined, p: Period | null) =>
  !points || !p ? [] : points.filter((x) => {
    const t = new Date(x.t).getTime()
    return t >= p.from && t < p.to
  })

/** Такой же по длине период прямо перед выбранным; null, если он выходит за начало данных */
export function prevPeriod(p: Period, g: Granularity, bounds: Period): Period | null {
  let n = 0
  for (let t = p.from; t < p.to; t = step(t, g)) n++
  const from = step(p.from, g, -n)
  return from < bounds.from ? null : { from, to: p.from }
}

export const PREV_HINT = 'К предыдущему периоду той же длины'

/* ---------- Подписи дат ---------- */

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_AXIS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Подпись интервала в подсказке: «12 окт 2026, 14:00» / «12 окт 2026» / «Октябрь 2026» / «2026» */
export function bucketLabel(ms: number, g: Granularity) {
  const d = new Date(ms)
  const day = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
  if (g === 'hour') return `${day}, ${pad(d.getHours())}:00`
  if (g === 'day') return day
  if (g === 'month') return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`
  return String(d.getFullYear())
}

/** Подпись деления оси: коротко; на 1 января — год */
export function tickLabel(ms: number, g: Granularity) {
  const d = new Date(ms)
  if (g === 'year') return String(d.getFullYear())
  if (g === 'month') return d.getMonth() === 0 ? String(d.getFullYear()) : MONTHS_AXIS[d.getMonth()]
  if (g === 'hour' && (d.getHours() !== 0 || d.getMinutes() !== 0)) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.getMonth() === 0 && d.getDate() === 1) return String(d.getFullYear())
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** Период словами: «2 окт — 1 ноя 2026» */
export function periodLabel(p: Period, g: Granularity) {
  const last = g === 'hour' ? p.to - HOUR : step(p.to, g, -1)
  if (g === 'year') {
    const a = new Date(p.from).getFullYear()
    const b = new Date(last).getFullYear()
    return a === b ? String(a) : `${a} — ${b}`
  }
  if (g === 'month') {
    const a = bucketLabel(p.from, 'month')
    const b = bucketLabel(last, 'month')
    return a === b ? a : `${a} — ${b}`
  }
  const a = bucketLabel(p.from, g)
  const b = bucketLabel(last, g)
  return a === b ? a : `${a} — ${b}`
}
