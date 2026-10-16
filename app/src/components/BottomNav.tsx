import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getTgUser, haptic } from '../lib/telegram'

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 2.5l7.5 3v5.6c0 4.7-3.1 8.9-7.5 10.4-4.4-1.5-7.5-5.7-7.5-10.4V5.5l7.5-3z"
      fill="currentColor"
      opacity=".9"
    />
    <path className="nav-check" d="M8.6 12.2l2.3 2.3 4.6-4.8" fill="none" stroke="var(--nav-bg-solid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Avatar() {
  const u = getTgUser()
  if (u?.photo_url) return <img className="nav-avatar" src={u.photo_url} alt="" />
  return (
    <span className="nav-avatar">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="8.5" r="4.2" fill="currentColor" />
        <path d="M4 20.5c.8-4 4.1-6.3 8-6.3s7.2 2.3 8 6.3" fill="currentColor" />
      </svg>
    </span>
  )
}

const ITEMS = [
  { to: '/', label: 'Подписка', icon: <ShieldIcon /> },
  { to: '/profile', label: 'Профиль', icon: <Avatar /> },
]

/**
 * Плавающая навигация: подложка активной вкладки «перепрыгивает» на выбранную
 * кнопку с пружиной и растяжением, иконка подпрыгивает.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const index = Math.max(0, ITEMS.findIndex((i) => i.to === pathname))
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
      <div className="bottom-nav-pill" style={{ ['--count' as string]: ITEMS.length }}>
        <span className="nav-indicator" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden>
          <i key={pulse} className={dir ? `is-moving-${dir}` : ''} />
        </span>
        {ITEMS.map((it, i) => (
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
