import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { haptic } from '../lib/telegram'

interface Props {
  open: boolean
  onClose(): void
  children: ReactNode
  /** Разрешить разворачивание на весь экран свайпом вверх (мобильные) */
  expandable?: boolean
}

const CLOSE_MS = 260

/**
 * Диалоговое окно: на мобильных — выдвижная панель снизу (тянется вверх
 * на весь экран, вниз — сворачивается/закрывается), на ПК — модалка.
 */
export function Sheet({ open, onClose, children, expandable = true }: Props) {
  const isDesktop = useIsDesktop()
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      setExpanded(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => {
        setMounted(false)
        setClosing(false)
      }, CLOSE_MS)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [mounted])

  if (!mounted) return null

  const onDown = (e: PointerEvent) => {
    if (isDesktop) return
    start.current = { y: e.clientY, t: Date.now() }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (!start.current) return
    let dy = e.clientY - start.current.y
    if (dy < 0 && (!expandable || expanded)) dy = dy / 6 // резиновое сопротивление
    setDrag(dy)
  }
  const onUp = () => {
    if (!start.current) return
    const dy = drag
    const fast = Math.abs(dy) / Math.max(1, Date.now() - start.current.t) > 0.5
    start.current = null
    setDrag(0)
    if (dy < -60 || (fast && dy < -20)) {
      if (expandable && !expanded) {
        setExpanded(true)
        haptic.tap('soft')
      }
    } else if (dy > 90 || (fast && dy > 30)) {
      if (expanded) setExpanded(false)
      else onClose()
    }
  }

  const style = drag
    ? { transform: `translateY(${Math.max(drag, expanded ? -20 : -window.innerHeight)}px)`, transition: 'none' }
    : undefined

  return createPortal(
    <div className={`sheet-root ${isDesktop ? 'is-modal' : 'is-sheet'} ${closing ? 'is-closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className={`sheet ${expanded ? 'is-expanded' : ''}`}
        style={style}
        role="dialog"
        aria-modal="true"
      >
        {isDesktop ? (
          <button className="sheet-close" onClick={onClose} aria-label="Закрыть">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <div
            className="sheet-grip"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <span />
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
