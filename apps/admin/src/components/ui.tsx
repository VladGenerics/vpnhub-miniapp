import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { copyText } from '../lib/format'
import { Icon } from './Icon'
import type { IconName } from './icons'
import { useToast } from './Toast'

/* Базовые элементы интерфейса панели. */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'md' | 'sm'
  icon?: IconName
  loading?: boolean
  wide?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, loading, wide, className, children, disabled, ...rest }: ButtonProps) {
  const iconOnly = !children
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${iconOnly ? 'btn-icon' : ''} ${wide ? 'is-wide' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  )
}

export type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'accent'

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return <span className={`badge ${tone !== 'neutral' ? `is-${tone}` : ''} ${dot ? 'badge-dot' : ''}`}>{children}</span>
}

export function Card({
  title,
  sub,
  right,
  children,
  flush,
  className,
}: {
  title?: ReactNode
  sub?: ReactNode
  right?: ReactNode
  children: ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {right && <div className="card-head-right">{right}</div>}
        </header>
      )}
      <div className={`card-body ${flush ? 'is-flush' : ''}`}>{children}</div>
    </section>
  )
}

export function Kpi({ icon, label, value, note }: { icon?: IconName; label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">
        {icon && (
          <span className="kpi-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        {label}
      </div>
      <div className="kpi-value">{value ?? <span className="skeleton" style={{ width: '60%', height: 28 }} />}</div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  )
}

export function Field({ label, hint, error, children }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : (
        hint && <div className="field-hint">{hint}</div>
      )}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange(v: boolean): void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  )
}

export const Skeleton = ({ width = '100%', height = 14 }: { width?: number | string; height?: number }) => (
  <span className="skeleton" style={{ width, height }} />
)

export function CopyButton({ value, label = 'Значение' }: { value: string | number; label?: string }) {
  const toast = useToast()
  return (
    <button
      type="button"
      className="copy-btn"
      aria-label={`Скопировать: ${label}`}
      title="Скопировать"
      onClick={async (e) => {
        e.stopPropagation()
        await copyText(String(value))
        toast(`${label} скопирован`)
      }}
    >
      <Icon name="copy" size={14} />
    </button>
  )
}

export function StateView({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorView({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const status = (error as { status?: number } | undefined)?.status
  return (
    <StateView
      title={status === 404 ? 'Не найдено' : status === 403 ? 'Нет доступа' : 'Не удалось загрузить данные'}
      text={status === 404 ? 'Запись удалена или адрес указан неверно' : (error as Error | undefined)?.message}
      action={
        onRetry && status !== 404 && (
          <Button icon="refresh" onClick={onRetry}>
            Повторить
          </Button>
        )
      }
    />
  )
}

export function PageHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <div className="page-head-actions">{children}</div>}
    </div>
  )
}

/** Модальное окно на <dialog>: фокус внутри окна, Esc и клик по фону закрывают */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
}: {
  open: boolean
  onClose(): void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  actions?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // showModal ставит фокус на первую кнопку (крестик) — переводим на первое поле ввода
      d.querySelector<HTMLElement>('input, textarea, select')?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onMouseDown={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="modal-inner">
          <div className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <Button variant="ghost" icon="close" aria-label="Закрыть" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {actions && <div className="modal-actions">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}

/** Число в поле ввода: только цифры и одна запятая/точка, до 2 знаков после */
export function useMoneyInput(initial = '') {
  const [raw, setRaw] = useState(initial)
  const set = (v: string) => {
    const cleaned = v.replace(',', '.').replace(/[^\d.]/g, '')
    const [int, ...rest] = cleaned.split('.')
    setRaw(rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int.slice(0, 9))
  }
  const value = raw === '' ? NaN : Number(raw)
  return { raw, set, value, reset: () => setRaw(initial) }
}
