import type { ReactNode } from 'react'
import { getTgUser } from '../lib/telegram'

/* Пункты основной навигации — общие для нижней панели (телефон) и боковой (ПК). */

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

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path d="M4 7.5A2.5 2.5 0 016.5 5h10A1.5 1.5 0 0118 6.5V8H6.5a.5.5 0 010-1H4z" fill="currentColor" opacity=".55" />
    <rect x="3" y="7" width="18" height="13" rx="3" fill="currentColor" opacity=".9" />
    <circle className="nav-coin" cx="16.5" cy="13.5" r="1.6" fill="var(--nav-bg-solid)" />
  </svg>
)

export function Avatar({ size = 24 }: { size?: number }) {
  const u = getTgUser()
  if (u?.photo_url) return <img className="nav-avatar" src={u.photo_url} alt="" style={{ width: size, height: size }} />
  return (
    <span className="nav-avatar" style={{ width: size, height: size }}>
      <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="8.5" r="4.2" fill="currentColor" />
        <path d="M4 20.5c.8-4 4.1-6.3 8-6.3s7.2 2.3 8 6.3" fill="currentColor" />
      </svg>
    </span>
  )
}

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Вложенные страницы, при которых пункт подсвечивается */
  match: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Подписка', icon: <ShieldIcon />, match: ['/device'] },
  { to: '/topup', label: 'Пополнить', icon: <WalletIcon />, match: [] },
  { to: '/profile', label: 'Профиль', icon: <Avatar />, match: ['/info', '/help', '/ui', '/emoji'] },
]

export const NAV_ROUTES = NAV_ITEMS.map((i) => i.to)

/** Индекс пункта меню для адреса (−1, если страница вне меню) */
export function navIndex(pathname: string) {
  const exact = NAV_ROUTES.indexOf(pathname)
  if (exact >= 0) return exact
  return NAV_ITEMS.findIndex((i) => i.match.some((p) => pathname.startsWith(p)))
}
