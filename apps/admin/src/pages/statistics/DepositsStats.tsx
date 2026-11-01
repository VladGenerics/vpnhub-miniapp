import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROVIDER_LABEL, type Granularity, type PaymentProvider } from '@vpnhub/shared'
import { useDepositsStats } from '../../api/queries'
import { change, CountUp, Kpi, Trend } from '../../components/ui'
import { num, rub, rubCompact, toDateInput } from '../../lib/format'
import type { Slot } from './charts/palette'
import { PieCard } from './charts/PieCard'
import { TimeSeriesCard, type Series } from './charts/TimeSeriesCard'
import { inPeriod, prevPeriod, PREV_HINT, useStatsPeriod } from './period'
import { AVG, PER, StatsFrame } from './StatsFrame'

/** Порядок и цвета способов оплаты фиксированы — цвет не меняется при скрытии других */
const PROVIDERS: PaymentProvider[] = ['yookassa', 'tg_stars', 'cryptobot', 'WATA', 'heleket', 'lolz', 'rollypay']
const slotOf = (i: number) => (i + 1) as Slot

/** Подпись к клику по столбцу: за какой отрезок откроются счета */
const PICK: Record<Granularity, string> = { hour: 'этот день', day: 'день', month: 'месяц', year: 'год' }

/*
 * Пополнения — оплаченные счета по времени оплаты. Накопительная сумма за всё время
 * (стартует с total_before) и динамика по способам оплаты с выбранным шагом.
 */
export default function DepositsStats() {
  const s = useStatsPeriod()
  const navigate = useNavigate()
  const q = useDepositsStats(s.query)

  const series = useMemo(() => {
    const d = q.data
    if (!d) return { cumulative: [] as Series[], byProvider: [] as Series[] }
    let acc = d.total_before
    const cumulative: Series = {
      key: 'sum',
      name: 'Сумма пополнений',
      slot: 1,
      data: d.points.map((p) => [new Date(p.t).getTime(), (acc = Math.round((acc + p.amount) * 100) / 100)]),
    }
    const byProvider = PROVIDERS.map<Series>((pr, i) => ({
      key: pr,
      name: PROVIDER_LABEL[pr],
      slot: slotOf(i),
      data: d.points.map((p) => [new Date(p.t).getTime(), p.by_provider[pr]?.amount ?? 0]),
    })).filter((x) => x.data.some(([, v]) => v > 0))
    return { cumulative: [cumulative], byProvider }
  }, [q.data])

  return (
    <StatsFrame s={s} error={q.error} refetch={q.refetch} hasData={!!q.data}>
      {(period) => {
        const win = inPeriod(q.data?.points, period)
        const amount = win.reduce((a, p) => a + p.amount, 0)
        const count = win.reduce((a, p) => a + p.count, 0)
        const prev = prevPeriod(period, s.g, s.bounds!)
        const prevAmount = prev ? inPeriod(q.data!.points, prev).reduce((a, p) => a + p.amount, 0) : 0
        const before = q.data!.total_before + inPeriod(q.data!.points, { from: 0, to: period.from }).reduce((a, p) => a + p.amount, 0)
        const props = { g: s.g, bounds: s.bounds!, period, onPeriod: s.setPeriod, fetching: q.isFetching }

        return (
          <div className="stack">
            <div className="kpi-grid">
              <Kpi
                icon="wallet"
                label="Пополнено за период"
                value={<CountUp value={Math.round(amount)} format={rub} />}
                trend={prev && <Trend value={change(amount, prevAmount)} hint={PREV_HINT} />}
                note={win.length ? `в среднем ${rubCompact(Math.round(amount / win.length))} ${AVG[s.g]}` : undefined} />
              <Kpi icon="receipt" label="Оплаченных счетов" value={<CountUp value={count} format={num} />} />
              <Kpi icon="card" label="Средний чек" value={count ? rub(Math.round(amount / count)) : '—'} />
              <Kpi icon="trendUp" label="Пополнено всего" value={<CountUp value={Math.round(before + amount)} format={rubCompact} />} note="на конец периода" />
            </div>

            <div className="stats-grid">
              <TimeSeriesCard title="Сумма пополнений, накопительно" type="area" cumulative series={series.cumulative} format={rub} className="is-wide" {...props} />
              <TimeSeriesCard
                title={`Пополнения ${PER[s.g]}`}
                type="bar"
                stacked
                series={series.byProvider}
                format={rub}
                total="Всего"
                className="is-wide"
                // шаг «часы» — счета за весь день: фильтр счетов по дням
                pickHint={`счета за ${PICK[s.g]}`}
                onPick={(from, to) => navigate(`/invoices?status=PAID&by=paid&from=${toDateInput(from)}&to=${toDateInput(to - 1)}`)}
                {...props}
              />
              <PieCard
                title="Способы оплаты"
                sub="Доля в сумме пополнений за период"
                centerLabel="за период"
                format={rubCompact}
                fetching={q.isFetching}
                items={PROVIDERS.map((pr, i) => ({
                  key: pr,
                  name: PROVIDER_LABEL[pr],
                  slot: slotOf(i),
                  value: Math.round(win.reduce((a, p) => a + (p.by_provider[pr]?.amount ?? 0), 0)),
                })).filter((x) => x.value > 0)}
              />
              <PieCard
                title="Количество оплат"
                sub="Сколько счетов оплачено каждым способом"
                centerLabel="оплат"
                format={num}
                fetching={q.isFetching}
                items={PROVIDERS.map((pr, i) => ({
                  key: pr,
                  name: PROVIDER_LABEL[pr],
                  slot: slotOf(i),
                  value: win.reduce((a, p) => a + (p.by_provider[pr]?.count ?? 0), 0),
                })).filter((x) => x.value > 0)}
              />
            </div>
          </div>
        )
      }}
    </StatsFrame>
  )
}
