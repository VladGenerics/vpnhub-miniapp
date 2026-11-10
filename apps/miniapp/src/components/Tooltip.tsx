import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EMOJI_CATALOG } from '@vpnhub/shared'
import { Lottie } from './Lottie'
import { useTipEmoji } from '../lib/tipEmoji'
import { haptic } from '../lib/telegram'

const GAP = 10
const EDGE = 8

/**
 * Подсказка над элементом: на ПК по наведению, на телефоне по нажатию (open снаружи).
 * emoji - необязательный значок в начале: строка с эмодзи или анимированный <Lottie />.
 * Рисуется поверх страницы (портал): карточки с overflow: hidden её не обрезают, у краёв экрана она сдвигается
 */
export function Tooltip({
  text,
  emoji,
  open,
  className,
  onClick,
  children,
}: {
  text: ReactNode
  emoji?: ReactNode
  open?: boolean
  className?: string
  onClick?(): void
  children: ReactNode
}) {
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
    <span ref={anchor} className={`tip-wrap ${className ?? ''}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
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

/**
 * Почему элемент недоступен. Строка/разметка - текст с эмодзи подсказок по умолчанию (TIP_EMOJI),
 * объект - свой эмодзи: имя анимированного (как у <Lottie name>, например E.wallet), обычный символ ('⏳')
 * или null - без значка
 */
export type DisabledHint = ReactNode | { text: ReactNode; emoji?: string | null }

function isHintObject(h: DisabledHint): h is { text: ReactNode; emoji?: string | null } {
  return typeof h === 'object' && h !== null && 'text' in h && !('$$typeof' in h)
}

/**
 * Обёртка для отключённого элемента (кнопки, «+»/«−» и т.п.): по наведению на ПК и по нажатию на телефоне
 * показывает подсказку, почему он недоступен. Сам отключённый элемент событий не ловит (pointer-events: none
 * в CSS), их получает обёртка - поэтому подсказка работает и у настоящего disabled.
 * block - обёртка во всю ширину (для растянутых кнопок)
 */
export function HintWrap({ hint, block, children }: { hint: DisabledHint; block?: boolean; children: ReactNode }) {
  const tipEmoji = useTipEmoji()
  const [open, setOpen] = useState(false)
  // подсказка по нажатию сама прячется через пару секунд
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setOpen(false), 3000)
    return () => clearTimeout(t)
  }, [open])

  const { text, emoji } = isHintObject(hint) ? hint : { text: hint, emoji: undefined }
  const name = emoji === undefined ? tipEmoji : emoji
  // имя эмодзи из паков (E.wallet) - анимация, всё остальное - обычный символ
  const icon = !name ? undefined : name in EMOJI_CATALOG ? <Lottie name={name} size={28} /> : name

  return (
    <Tooltip
      text={text}
      emoji={icon}
      open={open}
      className={`is-disabled-hint ${block ? 'is-block' : ''}`}
      onClick={() => {
        haptic.notify('warning')
        setOpen(true)
      }}
    >
      {children}
    </Tooltip>
  )
}
