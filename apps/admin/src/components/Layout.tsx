import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABEL } from '@vpnhub/shared'
import { USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthProvider'
import { setThemeMode, useThemeMode, type ThemeMode } from '../lib/theme'
import { Icon } from './Icon'
import type { IconName } from './icons'
import { Button } from './ui'

export const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Обзор', icon: 'dashboard' },
  { to: '/users', label: 'Пользователи', icon: 'users' },
  { to: '/invoices', label: 'Счета', icon: 'receipt' },
  { to: '/payment-methods', label: 'Платёжные системы', icon: 'card' },
  { to: '/statistics', label: 'Статистика', icon: 'chart' },
  { to: '/settings', label: 'Настройки', icon: 'settings' },
]

const THEMES: Record<ThemeMode, { next: ThemeMode; icon: IconName; label: string }> = {
  auto: { next: 'light', icon: 'monitor', label: 'Тема: как в системе' },
  light: { next: 'dark', icon: 'sun', label: 'Тема: светлая' },
  dark: { next: 'auto', icon: 'moon', label: 'Тема: тёмная' },
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  const [broken, setBroken] = useState(false)
  if (photo && !broken)
    return <img className="avatar" src={photo} alt="" width={30} height={30} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  return (
    <span className="avatar" aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Layout() {
  const { me, profile, logout } = useAuth()
  const theme = useThemeMode()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const section = NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  const title = section?.label ?? 'VPNHub'

  useEffect(() => {
    document.title = `${title} — VPNHub Admin`
  }, [title])

  // мобильное меню закрывается при переходе и по Esc, страница под ним не прокручивается
  useEffect(() => setOpen(false), [pathname])
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

  const name = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : me ? `ID ${me.tg_user_id}` : '…'
  const t = THEMES[theme]

  return (
    <div className="layout">
      <aside className={`side ${open ? 'is-open' : ''}`} id="side-nav" aria-label="Разделы">
        <div className="side-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          VPNHub
          <small>admin</small>
        </div>
        <nav className="side-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="side-link">
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          {USE_MOCKS ? (
            <span className="badge is-warn badge-dot">Демо-данные</span>
          ) : (
            <span>Панель управления VPNHub</span>
          )}
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
            <Button variant="ghost" icon={t.icon} aria-label={`${t.label}. Переключить`} title={t.label} onClick={() => setThemeMode(t.next)} />
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
