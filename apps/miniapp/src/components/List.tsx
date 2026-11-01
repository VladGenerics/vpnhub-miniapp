import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
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

export const Chevron = () => (
  <svg className="chevron" width="8" height="14" viewBox="0 0 8 14" aria-hidden>
    <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Цветная плитка-иконка как в настройках Telegram */
export function IconTile({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="icon-tile" style={{ background: color }}>
      {children}
    </span>
  )
}
