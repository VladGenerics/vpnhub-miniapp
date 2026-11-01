import { useLayoutEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { haptic } from '../lib/telegram'

export interface TabDef {
  key: string
  label: string
  badge?: string
  content: ReactNode
}

/** Сегмент-контрол «как папки в Telegram» + контент, листаемый свайпом. */
export function SwipeTabs({ tabs }: { tabs: TabDef[] }) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [height, setHeight] = useState<number>()
  const viewport = useRef<HTMLDivElement>(null)
  const panes = useRef<(HTMLDivElement | null)[]>([])
  const touch = useRef<{ x: number; y: number; axis?: 'x' | 'y' } | null>(null)

  // высота контейнера = высота активной вкладки
  useLayoutEffect(() => {
    const el = panes.current[index]
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    setHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [index])

  const go = (i: number) => {
    if (i === index) return
    haptic.select()
    setIndex(i)
  }

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onMove = (e: TouchEvent) => {
    const s = touch.current
    if (!s) return
    const t = e.touches[0]
    const mx = t.clientX - s.x
    const my = t.clientY - s.y
    if (!s.axis && Math.hypot(mx, my) > 8) s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    if (s.axis !== 'x') return
    const edge = (index === 0 && mx > 0) || (index === tabs.length - 1 && mx < 0)
    setDx(edge ? mx / 4 : mx)
  }
  const onEnd = () => {
    const w = viewport.current?.offsetWidth ?? 1
    if (touch.current?.axis === 'x') {
      if (dx < -w * 0.18 && index < tabs.length - 1) go(index + 1)
      else if (dx > w * 0.18 && index > 0) go(index - 1)
    }
    touch.current = null
    setDx(0)
  }

  const w = viewport.current?.offsetWidth ?? 1
  const progress = Math.min(Math.max(index - dx / w, 0), tabs.length - 1)

  return (
    <div className="tabs">
      <div className="segmented" role="tablist">
        <div
          className="segmented-thumb"
          style={{
            width: `calc((100% - 8px) / ${tabs.length})`,
            transform: `translateX(${progress * 100}%)`,
            transition: dx ? 'none' : undefined,
          }}
        />
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={i === index}
            className={`segmented-item ${i === index ? 'is-active' : ''}`}
            onClick={() => go(i)}
          >
            {t.label}
            {t.badge && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div
        className="tabs-viewport"
        ref={viewport}
        style={{ height }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
      >
        <div
          className="tabs-track"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dx}px))`,
            transition: dx ? 'none' : undefined,
          }}
        >
          {tabs.map((t, i) => (
            <div
              key={t.key}
              className={`tabs-pane ${i === index ? 'is-active' : ''}`}
              ref={(el) => {
                panes.current[i] = el
              }}
              aria-hidden={i !== index}
            >
              {t.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
