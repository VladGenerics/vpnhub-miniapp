import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { haptic } from '../lib/telegram'

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

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange(v: number): void; suffix?: string }) {
  const set = (v: number) => {
    const c = Math.min(max, Math.max(min, v))
    if (c !== value) haptic.select()
    onChange(c)
  }
  return (
    <div className="stepper">
      <button onClick={() => set(value - 1)} disabled={value <= min} aria-label="Меньше">
        −
      </button>
      <div className="stepper-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      <button onClick={() => set(value + 1)} disabled={value >= max} aria-label="Больше">
        +
      </button>
    </div>
  )
}

export function Chips({
  items,
  value,
  onChange,
  render,
}: {
  items: number[]
  value: number | null
  onChange(v: number): void
  render?(v: number): ReactNode
}) {
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
