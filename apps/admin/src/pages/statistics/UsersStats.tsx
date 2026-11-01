import { useMemo } from 'react'
import { useUsersStats } from '../../api/queries'
import { Kpi } from '../../components/ui'
import { num, percent } from '../../lib/format'
import { PieCard } from './charts/PieCard'
import { TimeSeriesCard, type Series } from './charts/TimeSeriesCard'
import { inPeriod, useStatsPeriod } from './period'
import { AVG, PER, StatsFrame } from './StatsFrame'

/*
 * Пользователи: накопительный рост (всего / заблокировали / боты), новые за интервал
 * по категориям и доли категорий. Категории не пересекаются: активные + заблокировали + боты = всего.
 */
export default function UsersStats() {
  const s = useStatsPeriod()
  const q = useUsersStats(s.query)

  const series = useMemo(() => {
    const pts = (q.data ?? []).map((p) => ({ ...p, ms: new Date(p.t).getTime() }))
    const map = (f: (p: (typeof pts)[number]) => number): [number, number][] => pts.map((p) => [p.ms, f(p)])
    return {
      cumulative: [
        { key: 'total', name: 'Всего', slot: 'neutral', data: map((p) => p.total) },
        { key: 'active', name: 'Активные', slot: 1, data: map((p) => p.total - p.blocked - p.bots) },
        { key: 'blocked', name: 'Заблокировали бота', slot: 2, data: map((p) => p.blocked) },
        { key: 'bots', name: 'Боты', slot: 3, data: map((p) => p.bots) },
      ] satisfies Series[],
      daily: [
        { key: 'active', name: 'Активные', slot: 1, data: map((p) => p.new_total - p.new_blocked - p.new_bots) },
        { key: 'blocked', name: 'Заблокировали бота', slot: 2, data: map((p) => p.new_blocked) },
        { key: 'bots', name: 'Боты', slot: 3, data: map((p) => p.new_bots) },
      ] satisfies Series[],
    }
  }, [q.data])

  return (
    <StatsFrame s={s} error={q.error} refetch={q.refetch} hasData={!!q.data}>
      {(period) => {
        const win = inPeriod(q.data, period)
        const last = win.at(-1)
        const sum = (f: (p: (typeof win)[number]) => number) => win.reduce((a, p) => a + f(p), 0)
        const nTotal = sum((p) => p.new_total)
        const nBlocked = sum((p) => p.new_blocked)
        const nBots = sum((p) => p.new_bots)
        const props = { g: s.g, bounds: s.bounds!, period, onPeriod: s.setPeriod, fetching: q.isFetching }

        return (
          <div className="stack">
            <div className="kpi-grid">
              <Kpi icon="users" label="Всего на конец периода" value={num(last?.total ?? 0)} note={`из них активных ${num(last ? last.total - last.blocked - last.bots : 0)}`} />
              <Kpi icon="userPlus" label="Новых за период" value={num(nTotal)} note={win.length ? `в среднем ${num(Math.round(nTotal / win.length))} ${AVG[s.g]}` : undefined} />
              <Kpi icon="trendDown" label="Заблокировали бота" value={num(nBlocked)} note={`${percent(nBlocked, nTotal)} новых`} />
              <Kpi icon="shield" label="Боты" value={num(nBots)} note={`${percent(nBots, nTotal)} новых`} />
            </div>

            <div className="stats-grid">
              <TimeSeriesCard title="Рост аудитории" type="line" cumulative series={series.cumulative} format={num} className="is-wide" {...props} />
              <TimeSeriesCard title={`Новые пользователи ${PER[s.g]}`} type="bar" stacked series={series.daily} format={num} total="Всего новых" className="is-wide" {...props} />
              <PieCard
                title="Новые за период"
                sub="Кем оказались пришедшие пользователи"
                centerLabel="новых"
                format={num}
                fetching={q.isFetching}
                items={[
                  { key: 'active', name: 'Активные', slot: 1, value: nTotal - nBlocked - nBots },
                  { key: 'blocked', name: 'Заблокировали бота', slot: 2, value: nBlocked },
                  { key: 'bots', name: 'Боты', slot: 3, value: nBots },
                ]}
              />
              <PieCard
                title="Вся аудитория"
                sub="На конец периода"
                centerLabel="всего"
                format={num}
                fetching={q.isFetching}
                items={[
                  { key: 'active', name: 'Активные', slot: 1, value: last ? last.total - last.blocked - last.bots : 0 },
                  { key: 'blocked', name: 'Заблокировали бота', slot: 2, value: last?.blocked ?? 0 },
                  { key: 'bots', name: 'Боты', slot: 3, value: last?.bots ?? 0 },
                ]}
              />
            </div>
          </div>
        )
      }}
    </StatsFrame>
  )
}
