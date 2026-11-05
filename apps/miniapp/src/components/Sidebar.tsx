import { NavLink, useLocation } from 'react-router-dom'
import { LuPanelLeft } from 'react-icons/lu'
import { useMe } from '../api/queries'
import { E } from '../data/emoji'
import { rub } from '../lib/format'
import { getTgUser } from '../lib/telegram'
import { useApp } from '../store/AppStore'
import { Lottie } from './Lottie'
import { Avatar, NAV_ITEMS, navIndex } from './nav'

const EXTRA = [
  { to: '/info', label: 'Информация', emoji: E.bulbTile },
  { to: '/help', label: 'Помощь', emoji: E.questionTile },
  { to: '/ui', label: 'Оформление', emoji: E.gearTile },
]

/** Страницы, которые при боковой панели - свои пункты меню, а не вложенные в «Профиль» */
export const SIDEBAR_PAGES = EXTRA.map((e) => e.to)

// Боковая панель слева на широком экране: меню, ссылки и профиль. Сворачивается до иконок, состояние запоминается.
export function Sidebar() {
  const { pathname } = useLocation()
  const { sidebarCollapsed: collapsed, toggleSidebar } = useApp()
  const { data: me } = useMe()
  const isExtra = (to: string) => pathname === to || pathname.startsWith(to + '/')
  // у статей и оформления в панели свои пункты, «Профиль» при них не подсвечиваем
  const active = EXTRA.some((it) => isExtra(it.to)) ? -1 : navIndex(pathname)
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
          <LuPanelLeft size={20} />
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
            className={`sidebar-item ${isExtra(it.to) ? 'is-active' : ''}`}
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
