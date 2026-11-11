import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { LuBadgePercent } from 'react-icons/lu'
import { HintWrap, Tooltip, type DisabledHint } from './Tooltip'
import { haptic } from '../lib/telegram'
import { devicesWord } from '../lib/format'

/** Плашка «Действует скидка 25 % за 6 устройств»: скидку видно сразу, а не только по зачёркнутой цене */
export function DiscountBadge({ percent, reason }: { percent: number; reason?: string }) {
  if (!(percent > 0.0049)) return null
  return (
    <div className="discount-badge">
      <LuBadgePercent size={18} />
      <span>
        Действует скидка <b>{Math.round(percent * 100)} %</b>
        {reason && ` ${reason}`}
      </span>
    </div>
  )
}

/** За что скидка: за число устройств, по акции или персональная, или вместе */
export function discountReason(devices: number, deviceDiscount: number, otherDiscount: number) {
  const parts = [deviceDiscount > 0 && `за ${devices} ${devicesWord(devices)}`, otherDiscount > 0 && 'по акции'].filter(Boolean)
  return parts.join(' и ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'l' | 'm' | 's'
  stretched?: boolean
  icon?: ReactNode
  /** Подсказка, пока кнопка disabled */
  hint?: DisabledHint | false
}

export function Button({ variant = 'primary', size = 'l', stretched, icon, hint, className, onClick, children, ...rest }: ButtonProps) {
  const button = (
    <button
      className={`btn btn-${variant} btn-${size} ${stretched ? 'is-stretched' : ''} ${className ?? ''}`}
      onClick={(e) => {
        haptic.tap(variant === 'danger' ? 'medium' : 'light')
        onClick?.(e)
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
  return rest.disabled && hint ? (
    <HintWrap hint={hint} block={stretched}>
      {button}
    </HintWrap>
  ) : (
    button
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => {
        haptic.select()
        onChange(!checked)
      }}
    >
      <span />
    </button>
  )
}

// Зажатие «+»/«−»: повтор с ускорением, шаг 1 → 5 → 10
const HOLD_DELAY = 400
function useHoldRepeat(apply: (dir: 1 | -1, step: number) => boolean) {
  const applyRef = useRef(apply)
  applyRef.current = apply
  const timer = useRef(0)
  const stop = useRef(() => {
    window.clearTimeout(timer.current)
    window.removeEventListener('pointerup', stop.current)
    window.removeEventListener('pointercancel', stop.current)
    window.removeEventListener('blur', stop.current)
  })
  useEffect(() => stop.current, [])

  return (dir: 1 | -1) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      stop.current()
      if (!applyRef.current(dir, 1)) return
      let n = 0
      const tick = () => {
        n++
        const step = n > 40 ? 10 : n > 20 ? 5 : 1
        if (!applyRef.current(dir, step)) return stop.current()
        timer.current = window.setTimeout(tick, n > 8 ? 50 : 110)
      }
      timer.current = window.setTimeout(tick, HOLD_DELAY)
      window.addEventListener('pointerup', stop.current)
      window.addEventListener('pointercancel', stop.current)
      window.addEventListener('blur', stop.current)
    },
    onPointerLeave: () => stop.current(),
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    // клавиатура
    onClick: (e: MouseEvent) => e.detail === 0 && applyRef.current(dir, 1),
  })
}

// Счётчик: кнопки и ввод числа руками. Пока печатают, поле может быть пустым; значение зажимается в min..max при вводе и уходе из поля
// minHint - почему меньше нельзя: на упоре «−» не отключается, а показывает подсказку (наведение или нажатие)
export function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
  minHint,
}: {
  value: number
  min: number
  max: number
  onChange(v: number): void
  suffix?: string
  minHint?: { text: ReactNode; emoji?: ReactNode }
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  // подсказка по нажатию сама прячется через пару секунд
  useEffect(() => {
    if (!hintOpen) return
    const t = setTimeout(() => setHintOpen(false), 3000)
    return () => clearTimeout(t)
  }, [hintOpen])
  // value обновится только после перерисовки
  const current = useRef(value)
  current.current = value
  const lastHaptic = useRef(0)
  // крупный шаг по кратным (37 → 40 → 45); false - упёрлись в границу
  const stepBy = (dir: 1 | -1, step: number) => {
    const v = current.current
    const raw = step === 1 ? v + dir : dir > 0 ? Math.floor(v / step) * step + step : Math.ceil(v / step) * step - step
    const c = Math.min(max, Math.max(min, raw))
    if (c === v) return false
    setDraft(null)
    // вибрация не чаще раза в 90 мс
    const now = performance.now()
    if (now - lastHaptic.current > 90) {
      lastHaptic.current = now
      haptic.select()
    }
    current.current = c
    onChange(c)
    return c !== (dir > 0 ? max : min)
  }
  const hold = useHoldRepeat(stepBy)
  const shown = draft ?? String(value)
  const atMin = value <= min
  const minus =
    atMin && minHint ? (
      <Tooltip text={minHint.text} emoji={minHint.emoji} open={hintOpen} onClose={() => setHintOpen(false)}>
        <button
          className="is-locked"
          aria-disabled
          aria-label="Меньше"
          onClick={() => {
            haptic.notify('warning')
            setHintOpen(true)
          }}
        >
          −
        </button>
      </Tooltip>
    ) : atMin ? (
      <HintWrap hint={`Минимум ${min}${suffix ? ` ${suffix}` : ''}`}>
        <button disabled aria-label="Меньше">
          −
        </button>
      </HintWrap>
    ) : (
      <button {...hold(-1)} aria-label="Меньше">
        −
      </button>
    )
  const plus =
    value >= max ? (
      <HintWrap hint={`Максимум ${max}${suffix ? ` ${suffix}` : ''}`}>
        <button disabled aria-label="Больше">
          +
        </button>
      </HintWrap>
    ) : (
      <button {...hold(1)} aria-label="Больше">
        +
      </button>
    )
  return (
    <div className="stepper">
      {minus}
      <label className="stepper-value">
        <input
          inputMode="numeric"
          value={shown}
          style={{ width: `${shown.length + 0.6}ch` }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, String(max).length)
            if (!digits) return setDraft('')
            const n = Math.min(max, Math.max(min, Number(digits)))
            setDraft(String(n))
            onChange(n)
          }}
          onFocus={(e) => e.target.select()}
          onBlur={() => setDraft(null)}
          aria-label="Значение"
        />
        {suffix && <small>{suffix}</small>}
      </label>
      {plus}
    </div>
  )
}

export function Chips({ items, value, onChange, render }: { items: number[]; value: number | null; onChange(v: number): void; render?(v: number): ReactNode }) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button
          key={String(it)}
          className={`chip ${it === value ? 'is-active' : ''}`}
          onClick={() => {
            haptic.select()
            onChange(it)
          }}
        >
          {render ? render(it) : it}
        </button>
      ))}
    </div>
  )
}
