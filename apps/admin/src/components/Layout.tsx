import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABEL } from '@vpnhub/shared'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Button } from './ui'

export const NAV: { to: string; label: string; icon: IconName; support?: boolean }[] = [
  { to: '/', label: 'Обзор', icon: 'dashboard' },
  { to: '/users', label: 'Пользователи', icon: 'users', support: true },
  { to: '/invoices', label: 'Счета', icon: 'receipt' },
  { to: '/payment-methods', label: 'Платёжные системы', icon: 'card' },
  { to: '/statistics', label: 'Статистика', icon: 'chart' },
  { to: '/settings', label: 'Настройки', icon: 'settings' },
]

// Помним последний адрес каждого раздела вместе с фильтрами и страницей: меню ведёт туда же,
// а не сбрасывает список. Открытую карточку (/users/123) тоже помним.
const lastPath: Record<string, string> = {}
const lastList: Record<string, string> = {}
export const sectionPath = (to: string) => lastPath[to] ?? to
export const sectionListPath = (to: string) => lastList[to] ?? to

function Avatar({ name, photo }: { name: string; photo?: string }) {
  const [broken, setBroken] = useState(false)
  if (photo && !broken) return <img className="avatar" src={photo} alt="" width={30} height={30} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  return (
    <span className="avatar" aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Layout() {
  const { me, profile, logout, isSupport } = useAuth()
  const nav = isSupport ? NAV.filter((n) => n.support) : NAV
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)

  const section = NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  if (section) {
    lastPath[section.to] = pathname + search
    if (!/\/\d+$/.test(pathname)) lastList[section.to] = pathname + search
  }
  const title = section?.label ?? 'VPNHub'

  useEffect(() => {
    document.title = `${title} — VPNHub Admin`
  }, [title])

  // мобильное меню закрывается при переходе, по Esc и на широком экране
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const wide = matchMedia('(min-width: 641px)')
    const onChange = () => wide.matches && setOpen(false)
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    if (!open) return
    document.body.classList.add('no-scroll')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('no-scroll')
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // «/» - к поиску, как в GitHub. В русской раскладке это «.»
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key === '/' || (e.code === 'Slash' && !e.shiftKey)) || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]')) return
      const search = document.querySelector<HTMLInputElement>('.content input[type="search"]')
      if (!search) return
      e.preventDefault()
      search.focus()
      search.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const name = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : me ? `ID ${me.tg_user_id}` : '…'

  return (
    <div className="layout">
      <aside className={`side ${open ? 'is-open' : ''}`} id="side-nav" aria-label="Разделы">
        <div className="side-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <span className="side-brand-name">VPNHub</span>
          <small>admin</small>
        </div>
        <nav className="side-nav">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n === section ? sectionListPath(n.to) : sectionPath(n.to)}
              state={{ fromNav: true }}
              end={n.to === '/'}
              className="side-link"
              data-label={n.label}
            >
              <Icon name={n.icon} />
              <span className="side-link-text">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <span>Панель управления VPNHub</span>
        </div>
      </aside>
      {open && <div className="side-backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <Button
            variant="ghost"
            icon="menu"
            className="menu-btn"
            aria-label="Меню"
            aria-expanded={open}
            aria-controls="side-nav"
            onClick={() => setOpen((v) => !v)}
          />
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            <div className="who">
              <div className="who-text">
                <b>{name}</b>
                <span>{me ? ROLE_LABEL[me.role] : ''}</span>
              </div>
              <Avatar name={name} photo={profile?.photo_url} />
            </div>
            <Button variant="ghost" icon="logout" aria-label="Выйти" title="Выйти" onClick={logout} />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
