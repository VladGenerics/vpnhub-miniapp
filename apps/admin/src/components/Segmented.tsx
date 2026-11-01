import { useLayoutEffect, useRef, useState } from 'react'

export interface SegOption<T extends string> {
  value: T
  label: string
}

/**
 * Сегмент-контрол по макету Tabs из ТЗ: подложка выбранного пункта
 * плавно переезжает под нажатый. Управляется стрелками с клавиатуры.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  small,
}: {
  options: SegOption<T>[]
  value: T
  onChange(v: T): void
  label: string
  small?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  useLayoutEffect(() => {
    const el = refs.current[index]
    if (!el) return
    const measure = () => setThumb({ x: el.offsetLeft, w: el.offsetWidth })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el.parentElement!)
    return () => ro.disconnect()
  }, [index, options.length])

  const move = (dir: number) => {
    const next = options[(index + dir + options.length) % options.length]
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  return (
    <div className={`seg ${small ? 'is-small' : ''}`} role="radiogroup" aria-label={label}>
      {thumb && <span className="seg-thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} aria-hidden />}
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className={`seg-item ${i === index ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') move(1)
            if (e.key === 'ArrowLeft') move(-1)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
