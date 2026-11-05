import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LuChevronRight } from 'react-icons/lu'
import { haptic } from '../lib/telegram'

export function Section({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      {title && <h3 className="section-title">{title}</h3>}
      <div className="section-card">{children}</div>
      {footer && <p className="section-footer">{footer}</p>}
    </section>
  )
}

interface CellProps {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  after?: ReactNode
  to?: string
  onClick?(): void
  chevron?: boolean
  tone?: 'default' | 'accent' | 'danger'
  multiline?: boolean
}

export function Cell({ icon, title, subtitle, after, to, onClick, chevron, tone = 'default', multiline }: CellProps) {
  const interactive = !!(to || onClick)
  const inner = (
    <>
      {icon && <div className="cell-icon">{icon}</div>}
      <div className="cell-main">
        <div className="cell-title">{title}</div>
        {subtitle && <div className={`cell-subtitle ${multiline ? 'is-multiline' : ''}`}>{subtitle}</div>}
      </div>
      {after && <div className="cell-after">{after}</div>}
      {(chevron ?? !!to) && <Chevron />}
    </>
  )
  const cls = `cell tone-${tone} ${interactive ? 'is-interactive' : ''}`
  const tap = () => {
    haptic.tap()
    onClick?.()
  }
  if (to)
    return (
      <Link className={cls} to={to} onClick={tap}>
        {inner}
      </Link>
    )
  if (onClick)
    return (
      <button className={cls} onClick={tap}>
        {inner}
      </button>
    )
  return <div className={cls}>{inner}</div>
}

export const Chevron = () => <LuChevronRight className="chevron" size={18} aria-hidden />
