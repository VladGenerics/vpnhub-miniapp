import { haptic } from '../lib/telegram'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

/** Сегмент-контрол без контента (выбор одного значения) — тот же вид, что у вкладок */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange(v: T): void
  label: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      <div
        className="segmented-thumb"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={`segmented-item ${o.value === value ? 'is-active' : ''}`}
          onClick={() => {
            if (o.value === value) return
            haptic.select()
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
