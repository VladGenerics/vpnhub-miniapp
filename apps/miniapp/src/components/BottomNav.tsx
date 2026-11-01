import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { haptic } from '../lib/telegram'
import { NAV_ITEMS } from './nav'

/**
 * Плавающая навигация: подложка активной вкладки «перепрыгивает» на выбранную
 * кнопку с пружиной и растяжением, иконка подпрыгивает.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const index = Math.max(0, NAV_ITEMS.findIndex((i) => i.to === pathname))
  const prev = useRef(index)
  const [dir, setDir] = useState<'left' | 'right' | null>(null)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (prev.current !== index) {
      setDir(index > prev.current ? 'right' : 'left')
      setPulse((p) => p + 1)
      prev.current = index
    }
  }, [index])

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav-pill" style={{ ['--count' as string]: NAV_ITEMS.length }}>
        <span className="nav-indicator" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden>
          <i key={pulse} className={dir ? `is-moving-${dir}` : ''} />
        </span>
        {NAV_ITEMS.map((it, i) => (
          <NavLink
            key={it.to}
            to={it.to}
            end
            replace
            className={`nav-item ${i === index ? 'is-active' : ''}`}
            onClick={() => i !== index && haptic.select()}
          >
            <span className="nav-icon" key={i === index ? `on-${pulse}` : 'off'}>
              {it.icon}
            </span>
            <span className="nav-label">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
