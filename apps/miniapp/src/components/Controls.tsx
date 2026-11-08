import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LuBadgePercent } from 'react-icons/lu'
import { Tooltip } from './Tooltip'
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
}

export function Button({ variant = 'primary', size = 'l', stretched, icon, className, onClick, children, ...rest }: ButtonProps) {
  return (
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
  const set = (v: number) => {
    const c = Math.min(max, Math.max(min, v))
    if (c !== value) haptic.select()
    onChange(c)
  }
  const shown = draft ?? String(value)
  const atMin = value <= min
  const minus =
    atMin && minHint ? (
      <Tooltip text={minHint.text} emoji={minHint.emoji} open={hintOpen}>
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
    ) : (
      <button onClick={() => (setDraft(null), set(value - 1))} disabled={atMin} aria-label="Меньше">
        −
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
      <button onClick={() => (setDraft(null), set(value + 1))} disabled={value >= max} aria-label="Больше">
        +
      </button>
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
