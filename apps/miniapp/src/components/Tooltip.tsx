import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const GAP = 10
const EDGE = 8

/**
 * Подсказка над элементом: на ПК по наведению, на телефоне по нажатию (open снаружи).
 * emoji - необязательный значок в начале: строка с эмодзи или анимированный <Lottie />.
 * Рисуется поверх страницы (портал): карточки с overflow: hidden её не обрезают, у краёв экрана она сдвигается
 */
export function Tooltip({ text, emoji, open, children }: { text: ReactNode; emoji?: ReactNode; open?: boolean; children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number } | null>(null)
  const shown = hover || !!open

  useLayoutEffect(() => {
    if (!shown) return setPos(null)
    const place = () => {
      const a = anchor.current?.getBoundingClientRect()
      const t = tip.current
      if (!a || !t) return
      const w = t.offsetWidth
      const center = a.left + a.width / 2
      const left = Math.min(Math.max(EDGE, center - w / 2), window.innerWidth - w - EDGE)
      setPos({ left, top: a.top - t.offsetHeight - GAP, arrow: center - left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [shown])

  return (
    <span ref={anchor} className="tip-wrap" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
      {shown &&
        createPortal(
          <span
            ref={tip}
            className={`tip ${pos ? 'is-shown' : ''}`}
            role="tooltip"
            style={pos ? { left: pos.left, top: pos.top, ['--arrow' as string]: `${pos.arrow}px` } : undefined}
          >
            {emoji && <span className="tip-emoji">{emoji}</span>}
            <span className="tip-text">{text}</span>
          </span>,
          document.body,
        )}
    </span>
  )
}
