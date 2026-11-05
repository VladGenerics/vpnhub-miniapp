import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './Icon'

// Свой выбор даты вместо <input type="date">: у системного календаря в каждом браузере свой вид,
// и в тёмной теме он выглядит чужим. Значение - строка yyyy-mm-dd, как у обычного поля.

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const parse = (v: string) => v.split('-').map(Number) as [number, number, number]
const todayKey = () => {
  const d = new Date()
  return toKey(d.getFullYear(), d.getMonth(), d.getDate())
}
/** Сдвиг даты на n дней по календарю */
const shift = (v: string, n: number) => {
  const [y, m, d] = parse(v)
  const t = new Date(y, m - 1, d + n)
  return toKey(t.getFullYear(), t.getMonth(), t.getDate())
}
const clamp = (v: string, min?: string, max?: string) => (min && v < min ? min : max && v > max ? max : v)

export function DateInput({
  value,
  onChange,
  min,
  max,
  label,
  range,
  clearable,
}: {
  value: string
  onChange(v: string): void
  min?: string
  max?: string
  label: string
  /** Подсветка выбранного периода: начало и конец */
  range?: [string | undefined, string | undefined]
  /** Кнопка «Очистить» в календаре */
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  // курсор - день, который в фокусе; по нему же выбирается показанный месяц
  const [cursor, setCursor] = useState(() => clamp(value || todayKey(), min, max))
  const [alignEnd, setAlignEnd] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) setCursor(clamp(value || todayKey(), min, max))
  }, [open])

  // закрытие по клику мимо и по Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // у правого края экрана календарь открывается влево
  useLayoutEffect(() => {
    if (!open || !root.current) return
    const r = root.current.getBoundingClientRect()
    setAlignEnd(r.left + 296 > window.innerWidth - 8)
  }, [open])

  // фокус идёт за курсором стрелками
  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus()
  }, [open, cursor])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    trigger.current?.focus()
  }

  const [cy, cm] = parse(cursor)
  const first = new Date(cy, cm - 1, 1)
  const lead = (first.getDay() + 6) % 7 // понедельник - первый
  const cells = Array.from({ length: 42 }, (_, i) => {
    const t = new Date(cy, cm - 1, 1 - lead + i)
    return { key: toKey(t.getFullYear(), t.getMonth(), t.getDate()), day: t.getDate(), out: t.getMonth() !== cm - 1 }
  })
  // шестая неделя целиком из следующего месяца - не рисуем
  const days = cells[35].out && cells[35].day < 15 ? cells.slice(0, 35) : cells

  const monthStart = toKey(cy, cm - 1, 1)
  const monthEnd = toKey(cy, cm - 1, new Date(cy, cm, 0).getDate())
  const canPrev = !min || min < monthStart
  const canNext = !max || max > monthEnd
  const goMonth = (n: number) => {
    const t = new Date(cy, cm - 1 + n, 1)
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
    setCursor(clamp(toKey(t.getFullYear(), t.getMonth(), Math.min(parse(cursor)[2], last)), min, max))
  }

  const onGridKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in moves) setCursor(clamp(shift(cursor, moves[e.key]), min, max))
    else if (e.key === 'PageUp') goMonth(-1)
    else if (e.key === 'PageDown') goMonth(1)
    else return
    e.preventDefault()
  }

  const today = todayKey()
  const [rFrom, rTo] = range ?? []
  const shown = value ? value.split('-').reverse().join('.') : ''

  return (
    <div className="date-input" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`input date-input-btn ${open ? 'is-open' : ''}`}
        aria-label={`${label}${shown ? `: ${shown}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={shown ? '' : 'muted'}>{shown || 'дд.мм.гггг'}</span>
        <Icon name="calendar" size={16} />
      </button>

      {open && (
        <div ref={pop} className={`cal ${alignEnd ? 'is-end' : ''}`} role="dialog" aria-label={label}>
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => goMonth(-1)} disabled={!canPrev} aria-label="Предыдущий месяц">
              <Icon name="chevronLeft" size={16} />
            </button>
            <b aria-live="polite">
              {MONTHS[cm - 1]} {cy}
            </b>
            <button type="button" className="cal-nav" onClick={() => goMonth(1)} disabled={!canNext} aria-label="Следующий месяц">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className="cal-grid" role="grid" onKeyDown={onGridKey}>
            {WEEK.map((w) => (
              <span key={w} className="cal-week" role="columnheader">
                {w}
              </span>
            ))}
            {days.map((c) => {
              const disabled = (!!min && c.key < min) || (!!max && c.key > max)
              const inRange = !!rFrom && !!rTo && c.key >= rFrom && c.key <= rTo
              const cls = [
                'cal-day',
                c.out && 'is-out',
                c.key === today && 'is-today',
                c.key === value && 'is-selected',
                inRange && 'in-range',
                inRange && c.key === rFrom && 'range-start',
                inRange && c.key === rTo && 'range-end',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={c.key}
                  type="button"
                  className={cls}
                  data-day={c.key}
                  role="gridcell"
                  tabIndex={c.key === cursor ? 0 : -1}
                  disabled={disabled}
                  aria-selected={c.key === value}
                  aria-label={c.key.split('-').reverse().join('.')}
                  onClick={() => pick(c.key)}
                >
                  {c.day}
                </button>
              )
            })}
          </div>
          <div className="cal-foot">
            <button type="button" className="link" disabled={(!!min && today < min) || (!!max && today > max)} onClick={() => pick(today)}>
              Сегодня
            </button>
            {clearable && value && (
              <button type="button" className="link muted" onClick={() => pick('')}>
                Очистить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
