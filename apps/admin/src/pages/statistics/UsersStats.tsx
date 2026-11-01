import { useMemo } from 'react'
import { useUsersStats } from '../../api/queries'
import { change, CountUp, Kpi, Trend } from '../../components/ui'
import { num, percent } from '../../lib/format'
import { PieCard } from './charts/PieCard'
import { TimeSeriesCard, type Series } from './charts/TimeSeriesCard'
import { inPeriod, prevPeriod, PREV_HINT, useStatsPeriod } from './period'
import { AVG, PER, StatsFrame } from './StatsFrame'

/*
 * Пользователи: рост аудитории и новые за интервал — по датам регистрации. Когда человек
 * заблокировал бота или стал ботом, в базе не хранится, поэтому категории (активные,
 * заблокировали, боты) — только в круговых диаграммах и по текущим флагам.
 */
export default function UsersStats() {
  const s = useStatsPeriod()
  const q = useUsersStats(s.query)

  const series = useMemo(() => {
    const pts = (q.data?.points ?? []).map((p) => ({ ...p, ms: new Date(p.t).getTime() }))
    const map = (f: (p: (typeof pts)[number]) => number): [number, number][] => pts.map((p) => [p.ms, f(p)])
    return {
      cumulative: [{ key: 'total', name: 'Всего', slot: 1, data: map((p) => p.total) }] satisfies Series[],
      daily: [{ key: 'new', name: 'Новые', slot: 1, data: map((p) => p.new_total) }] satisfies Series[],
    }
  }, [q.data])

  return (
    <StatsFrame s={s} error={q.error} refetch={q.refetch} hasData={!!q.data}>
      {(period) => {
        const now = q.data!.now
        const win = inPeriod(q.data!.points, period)
        const last = win.at(-1)
        const sum = (f: (p: (typeof win)[number]) => number) => win.reduce((a, p) => a + f(p), 0)
        const nTotal = sum((p) => p.new_total)
        const nBlocked = sum((p) => p.new_blocked)
        const nBots = sum((p) => p.new_bots)
        const prev = prevPeriod(period, s.g, s.bounds!)
        const nPrev = prev ? inPeriod(q.data!.points, prev).reduce((a, p) => a + p.new_total, 0) : 0
        const props = { g: s.g, bounds: s.bounds!, period, onPeriod: s.setPeriod, fetching: q.isFetching }

        return (
          <div className="stack">
            <div className="kpi-grid">
              <Kpi icon="users" label="Всего на конец периода" value={<CountUp value={last?.total ?? 0} format={num} />} note={last && last.total !== now.total ? `сейчас ${num(now.total)}` : undefined} />
              <Kpi
                icon="userPlus"
                label="Новых за период"
                value={<CountUp value={nTotal} format={num} />}
                trend={prev && <Trend value={change(nTotal, nPrev)} hint={PREV_HINT} />}
                note={win.length ? `в среднем ${num(Math.round(nTotal / win.length))} ${AVG[s.g]}` : undefined} />
              <Kpi icon="trendDown" label="Заблокировали бота" value={<CountUp value={now.blocked} format={num} />} note={`сейчас · ${percent(now.blocked, now.total)} аудитории`} />
              <Kpi icon="shield" label="Боты" value={<CountUp value={now.bots} format={num} />} note={`сейчас · ${percent(now.bots, now.total)} аудитории`} />
            </div>

            <div className="stats-grid">
              <TimeSeriesCard title="Рост аудитории" type="line" cumulative series={series.cumulative} format={num} className="is-wide" {...props} />
              <TimeSeriesCard title={`Новые пользователи ${PER[s.g]}`} type="bar" series={series.daily} format={num} className="is-wide" {...props} />
              <PieCard
                title="Новые за период"
                sub="Кем пришедшие пользователи оказались сейчас"
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
                sub="Сейчас, без учёта периода"
                centerLabel="всего"
                format={num}
                fetching={q.isFetching}
                items={[
                  { key: 'active', name: 'Активные', slot: 1, value: now.total - now.blocked - now.bots },
                  { key: 'blocked', name: 'Заблокировали бота', slot: 2, value: now.blocked },
                  { key: 'bots', name: 'Боты', slot: 3, value: now.bots },
                ]}
              />
            </div>
          </div>
        )
      }}
    </StatsFrame>
  )
}
