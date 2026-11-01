import { useState } from 'react'
import { dateShort } from '../lib/format'

/**
 * Лёгкий столбчатый график для обзора — без ECharts, чтобы главная открывалась быстро.
 * Наведение (или фокус с клавиатуры) показывает значение дня над графиком.
 */
export function MiniBars({
  points,
  format,
  total,
  color = 'var(--accent)',
}: {
  points: { t: string; v: number }[]
  format(v: number): string
  /** Подпись итога, когда ни один столбец не выбран */
  total: string
  color?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.v))
  const cur = active === null ? null : points[active]

  return (
    <div className="minibars" style={{ ['--c' as string]: color }}>
      <div className="minibars-readout" aria-live="polite">
        <b>{cur ? format(cur.v) : total}</b>
        <span>{cur ? dateShort(cur.t) : 'за 30 дней'}</span>
      </div>
      <div className="minibars-bars" onMouseLeave={() => setActive(null)}>
        {points.map((p, i) => (
          <button
            key={p.t}
            type="button"
            className={`minibars-bar ${active === i ? 'is-active' : ''}`}
            style={{ height: `${Math.max(2, (p.v / max) * 100)}%` }}
            aria-label={`${dateShort(p.t)}: ${format(p.v)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </div>
      {points.length > 0 && (
        <div className="minibars-axis">
          <span>{dateShort(points[0].t)}</span>
          <span>{dateShort(points[points.length - 1].t)}</span>
        </div>
      )}
    </div>
  )
}
