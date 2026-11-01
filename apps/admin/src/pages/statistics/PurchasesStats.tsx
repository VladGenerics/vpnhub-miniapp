import { useMemo } from 'react'
import { PURCHASE_KIND_LABEL, plural, type PurchaseKind } from '@vpnhub/shared'
import { usePurchasesStats } from '../../api/queries'
import { change, CountUp, Kpi, Trend } from '../../components/ui'
import { num, rub, rubCompact } from '../../lib/format'
import type { Slot } from './charts/palette'
import { PieCard } from './charts/PieCard'
import { TimeSeriesCard, type Series } from './charts/TimeSeriesCard'
import { inPeriod, prevPeriod, PREV_HINT, useStatsPeriod } from './period'
import { PER, StatsFrame } from './StatsFrame'

/** Виды покупок в фиксированном порядке — у каждого свой цвет во всех графиках */
const KINDS: PurchaseKind[] = ['VPN_FIRST_PURCHASE', 'VPN_RENEWAL', 'VPN_EXTENSION', 'VPN_AUTORENEWAL', 'DEVICE_SLOTS', 'VPN_PURCHASE']
const slotOf = (k: PurchaseKind) => (KINDS.indexOf(k) + 1) as Slot
const slotsWord = (n: number) => `${num(n)} ${plural(n, ['слот', 'слота', 'слотов'])}`

/*
 * Покупки: доли видов по количеству, сумма по каждому виду во времени
 * и распределение количества покупок по видам с выбранным шагом.
 */
export default function PurchasesStats() {
  const s = useStatsPeriod()
  const q = usePurchasesStats(s.query)

  const series = useMemo(() => {
    const pts = (q.data ?? []).map((p) => ({ ...p, ms: new Date(p.t).getTime() }))
    const make = (f: 'count' | 'amount') =>
      KINDS.map<Series>((k) => ({
        key: k,
        name: PURCHASE_KIND_LABEL[k],
        slot: slotOf(k),
        data: pts.map((p) => [p.ms, p.by_kind[k]?.[f] ?? 0]),
      })).filter((x) => x.data.some(([, v]) => v > 0))
    return { count: make('count'), amount: make('amount') }
  }, [q.data])

  return (
    <StatsFrame s={s} error={q.error} refetch={q.refetch} hasData={!!q.data}>
      {(period) => {
        const win = inPeriod(q.data, period)
        const totals = KINDS.map((k) => ({
          k,
          count: win.reduce((a, p) => a + (p.by_kind[k]?.count ?? 0), 0),
          amount: win.reduce((a, p) => a + (p.by_kind[k]?.amount ?? 0), 0),
        }))
        const count = totals.reduce((a, t) => a + t.count, 0)
        const amount = totals.reduce((a, t) => a + t.amount, 0)
        const slots = win.reduce((a, p) => a + p.slots, 0)
        const prev = prevPeriod(period, s.g, s.bounds!)
        const prevAmount = prev ? inPeriod(q.data, prev).reduce((a, p) => a + KINDS.reduce((b, k) => b + (p.by_kind[k]?.amount ?? 0), 0), 0) : 0
        const slotsAmount = totals.find((t) => t.k === 'DEVICE_SLOTS')!.amount
        const props = { g: s.g, bounds: s.bounds!, period, onPeriod: s.setPeriod, fetching: q.isFetching }

        return (
          <div className="stack">
            <div className="kpi-grid">
              <Kpi icon="receipt" label="Покупок за период" value={<CountUp value={count} format={num} />} />
              <Kpi
                icon="wallet"
                label="Сумма покупок"
                value={<CountUp value={Math.round(amount)} format={rub} />}
                trend={prev && <Trend value={change(amount, prevAmount)} hint={PREV_HINT} />}
              />
              <Kpi icon="card" label="Средний чек" value={count ? rub(Math.round(amount / count)) : '—'} />
              <Kpi icon="monitor" label="Куплено слотов" value={<CountUp value={slots} format={num} />} note={`на ${rubCompact(Math.round(slotsAmount))}`} />
            </div>

            <div className="stats-grid">
              <PieCard
                title="Виды покупок"
                sub="Доля по количеству покупок"
                centerLabel="покупок"
                format={num}
                fetching={q.isFetching}
                items={totals
                  .filter((t) => t.count > 0)
                  .map((t) => ({
                    key: t.k,
                    name: PURCHASE_KIND_LABEL[t.k],
                    slot: slotOf(t.k),
                    value: t.count,
                    note: t.k === 'DEVICE_SLOTS' ? slotsWord(slots) : undefined,
                  }))}
              />
              <PieCard
                title="Выручка по видам"
                sub="Доля в сумме покупок"
                centerLabel="за период"
                format={rubCompact}
                fetching={q.isFetching}
                items={totals
                  .filter((t) => t.amount > 0)
                  .map((t) => ({ key: t.k, name: PURCHASE_KIND_LABEL[t.k], slot: slotOf(t.k), value: Math.round(t.amount) }))}
              />
              <TimeSeriesCard title={`Сумма по видам покупок ${PER[s.g]}`} type="line" series={series.amount} format={rub} className="is-wide" {...props} />
              <TimeSeriesCard
                title={`Количество покупок ${PER[s.g]}`}
                type="bar"
                stacked
                series={series.count}
                format={num}
                total="Всего покупок"
                className="is-wide"
                {...props}
              />
            </div>
          </div>
        )
      }}
    </StatsFrame>
  )
}
