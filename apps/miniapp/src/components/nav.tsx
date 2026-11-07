import type { ReactNode } from 'react'
import { PiShieldCheckFill, PiUserFill, PiWalletFill } from 'react-icons/pi'
import { getTgUser } from '../lib/telegram'

// Пункты меню, общие для нижней панели (телефон) и боковой (ПК)

export function Avatar({ size = 24 }: { size?: number }) {
  const u = getTgUser()
  if (u?.photo_url) return <img className="nav-avatar" src={u.photo_url} alt="" style={{ width: size, height: size }} />
  return (
    <span className="nav-avatar" style={{ width: size, height: size }}>
      <PiUserFill size={size * 0.62} />
    </span>
  )
}

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Подпись в боковой панели на ПК, если отличается от нижнего меню */
  wideLabel?: string
  /** Вложенные страницы, на которых пункт тоже подсвечен */
  match: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Подписка', icon: <PiShieldCheckFill size={24} />, match: ['/device'] },
  { to: '/topup', label: 'Пополнить', icon: <PiWalletFill size={24} />, match: [] },
  { to: '/profile', label: 'Профиль', icon: <Avatar />, match: ['/info', '/help', '/ui', '/emoji'] },
]

export const NAV_ROUTES = NAV_ITEMS.map((i) => i.to)

/** Индекс пункта меню для адреса, −1 если страницы нет в меню */
export function navIndex(pathname: string) {
  const exact = NAV_ROUTES.indexOf(pathname)
  if (exact >= 0) return exact
  return NAV_ITEMS.findIndex((i) => i.match.some((p) => pathname.startsWith(p)))
}
