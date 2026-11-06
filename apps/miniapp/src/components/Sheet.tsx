import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { haptic } from '../lib/telegram'

interface Props {
  open: boolean
  onClose(): void
  children: ReactNode
  /** Можно ли растянуть на весь экран свайпом вверх */
  expandable?: boolean
  /** На телефоне сразу во весь экран (настройки с длинным содержимым) */
  full?: boolean
}

const CLOSE_MS = 260
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

// На телефоне - шторка снизу (вверх разворачивается, вниз закрывается), на ПК - обычная модалка
export function Sheet({ open, onClose, children, expandable = true, full = false }: Props) {
  const isDesktop = useIsDesktop()
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ y: number; t: number } | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      setExpanded(full)
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
    // фокус уходит в окно и не выпадает из него по Tab, после закрытия возвращается туда, где был.
    // Фокусируем само окно, а не первое поле: на телефоне иначе сразу вылезет клавиатура
    const back = document.activeElement as HTMLElement | null
    sheetRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current()
      if (e.key !== 'Tab' || !sheetRef.current) return
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return e.preventDefault()
      const first = items[0]
      const last = items[items.length - 1]
      const inside = sheetRef.current.contains(document.activeElement)
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === sheetRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      if (back?.isConnected) back.focus({ preventScroll: true })
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
      if (expanded && !full) setExpanded(false)
      else onClose()
    }
  }

  const style = drag ? { transform: `translateY(${Math.max(drag, expanded ? -20 : -window.innerHeight)}px)`, transition: 'none' } : undefined

  return createPortal(
    <div className={`sheet-root ${isDesktop ? 'is-modal' : 'is-sheet'} ${closing ? 'is-closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={sheetRef} tabIndex={-1} className={`sheet ${expanded ? 'is-expanded' : ''}`} style={style} role="dialog" aria-modal="true">
        {isDesktop ? (
          <button className="sheet-close" onClick={onClose} aria-label="Закрыть">
            <LuX size={18} />
          </button>
        ) : (
          <div className="sheet-grip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span />
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
