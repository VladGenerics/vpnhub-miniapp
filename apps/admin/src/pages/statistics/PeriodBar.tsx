import type { Granularity } from '@vpnhub/shared'
import { Segmented } from '../../components/Segmented'
import { fromDateInput, toDateInput } from '../../lib/format'
import { GRANULARITIES, PRESETS, presetPeriod, step, type Period } from './period'

/**
 * Одна строка фильтров над всеми графиками вкладки: шаг, быстрые периоды и даты вручную.
 * Всё, что ниже, считается по выбранному периоду.
 */
export function PeriodBar({
  g,
  bounds,
  period,
  onGranularity,
  onPeriod,
}: {
  g: Granularity
  bounds: Period
  period: Period
  onGranularity(g: Granularity): void
  onPeriod(p: Period, immediate?: boolean): void
}) {
  const presets = PRESETS[g].map((p) => ({ ...p, period: presetPeriod(p, g, bounds) }))
  const active = presets.find((p) => p.period.from === period.from && p.period.to === period.to)
  // поля дат — по дням включительно; для часов «по» — день, в котором кончается период
  const lastDay = period.to - 1
  const min = toDateInput(bounds.from)
  const max = toDateInput(bounds.to - 1)

  const setFrom = (v: string) => {
    if (!v) return
    const from = fromDateInput(v)
    onPeriod({ from, to: Math.max(period.to, step(from, 'day')) }, true)
  }
  const setTo = (v: string) => {
    if (!v) return
    // календарным шагом, не + 24 ч: в день перевода часов сутки длятся 23 или 25 ч
    const day = fromDateInput(v)
    onPeriod({ from: Math.min(period.from, day), to: step(day, 'day') }, true)
  }

  return (
    <div className="stats-head">
      <Segmented<Granularity> options={GRANULARITIES} value={g} onChange={onGranularity} label="Шаг графиков" small />
      <div className="period">
        <div className="period-presets" role="group" aria-label="Быстрый выбор периода">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`chip ${active === p ? 'is-active' : ''}`}
              aria-pressed={active === p}
              onClick={() => onPeriod(p.period, true)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="period-dates">
          <input
            className="input"
            type="date"
            aria-label="Начало периода"
            min={min}
            max={max}
            value={toDateInput(period.from)}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="muted">—</span>
          <input
            className="input"
            type="date"
            aria-label="Конец периода"
            min={min}
            max={max}
            value={toDateInput(lastDay)}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
