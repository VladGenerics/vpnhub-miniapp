import { useState } from 'react'
import { dateShort } from '../lib/format'

/**
 * Лёгкий столбчатый график для обзора — без ECharts, чтобы главная открывалась быстро.
 * Наведение (или фокус с клавиатуры) показывает значение дня над графиком.
 * active/onActive — если выбранным днём управляет родитель: соседние графики подсвечивают один и тот же день.
 * onPick — клик по столбцу (например, открыть счета за этот день); pickHint — подпись к этому действию.
 */
export function MiniBars({
  points,
  format,
  total,
  color = 'var(--accent)',
  active: activeProp,
  onActive,
  onPick,
  pickHint,
}: {
  points: { t: string; v: number }[]
  format(v: number): string
  /** Подпись итога, когда ни один столбец не выбран */
  total: string
  color?: string
  active?: number | null
  onActive?(i: number | null): void
  onPick?(i: number): void
  pickHint?: string
}) {
  const [own, setOwn] = useState<number | null>(null)
  const active = activeProp === undefined ? own : activeProp
  const setActive = onActive ?? setOwn
  const max = Math.max(1, ...points.map((p) => p.v))
  const cur = active === null ? null : points[active]

  return (
    <div className={`minibars ${onPick ? 'is-pickable' : ''}`} style={{ ['--c' as string]: color }}>
      <div className="minibars-readout" aria-live="polite">
        <b>{cur ? format(cur.v) : total}</b>
        <span>
          {cur ? dateShort(cur.t) : 'за 30 дней'}
          {cur && onPick && pickHint && <span className="minibars-hint"> · клик — {pickHint}</span>}
        </span>
      </div>
      <div className="minibars-bars" onMouseLeave={() => setActive(null)}>
        {points.map((p, i) => (
          <button
            key={p.t}
            type="button"
            className={`minibars-bar ${active === i ? 'is-active' : ''}`}
            style={{ height: `${Math.max(2, (p.v / max) * 100)}%` }}
            aria-label={`${dateShort(p.t)}: ${format(p.v)}${onPick && pickHint ? `, открыть ${pickHint}` : ''}`}
            onClick={onPick && (() => onPick(i))}
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
