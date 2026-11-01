import { NavLink, useLocation } from 'react-router-dom'
import { useMe } from '../api/queries'
import { E } from '../data/emoji'
import { rub } from '../lib/format'
import { getTgUser } from '../lib/telegram'
import { useApp } from '../store/AppStore'
import { Lottie } from './Lottie'
import { Avatar, NAV_ITEMS, navIndex } from './nav'

const PanelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M15 4.5v15" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

const EXTRA = [
  { to: '/info', label: 'Информация', emoji: E.bulbTile },
  { to: '/help', label: 'Помощь', emoji: E.questionTile },
  { to: '/ui', label: 'Оформление', emoji: E.gearTile },
]

/**
 * Боковая панель справа для широких экранов (как в ChatGPT/Gemini):
 * навигация, ссылки и карточка пользователя. Сворачивается до полосы иконок,
 * состояние запоминается.
 */
export function Sidebar() {
  const { pathname } = useLocation()
  const { sidebarCollapsed: collapsed, toggleSidebar } = useApp()
  const { data: me } = useMe()
  const active = navIndex(pathname)
  const u = getTgUser()
  const name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : 'Мой аккаунт'

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Боковая панель">
      <div className="sidebar-head">
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
        >
          <PanelIcon />
        </button>
        <div className="sidebar-brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width={28} height={28} alt="" />
          <span>VPNHub</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {NAV_ITEMS.map((it, i) => (
          <NavLink
            key={it.to}
            to={it.to}
            end
            className={`sidebar-item ${i === active ? 'is-active' : ''}`}
            title={collapsed ? it.label : undefined}
            aria-label={collapsed ? it.label : undefined}
          >
            <span className="sidebar-icon">{it.icon}</span>
            <span className="sidebar-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-sep" />

      <nav className="sidebar-nav is-secondary" aria-label="Дополнительно">
        {EXTRA.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `sidebar-item ${isActive || pathname.startsWith(it.to + '/') ? 'is-active' : ''}`}
            title={collapsed ? it.label : undefined}
            aria-label={collapsed ? it.label : undefined}
          >
            <span className="sidebar-icon">
              <Lottie name={it.emoji} size={24} />
            </span>
            <span className="sidebar-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <NavLink to="/profile" className="sidebar-user" title={collapsed ? name : undefined}>
        <Avatar size={36} />
        <span className="sidebar-user-text">
          <b>{name}</b>
          <span>{me ? `Баланс ${rub(me.balance)}` : ' '}</span>
        </span>
      </NavLink>
    </aside>
  )
}
