import { useEffect, useRef } from 'react'

/* Минимальная типизация Telegram WebApp — только то, что используем. */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotifyType = 'error' | 'success' | 'warning'

interface TgButton {
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface TgWebApp {
  initData: string
  initDataUnsafe: { user?: TgUser }
  colorScheme: 'light' | 'dark'
  platform: string
  version: string
  ready(): void
  expand(): void
  isVersionAtLeast(v: string): boolean
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  setBottomBarColor?(c: string): void
  disableVerticalSwipes?(): void
  openTelegramLink(url: string): void
  openLink(url: string): void
  openInvoice?(url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void
  onEvent(e: string, cb: () => void): void
  offEvent(e: string, cb: () => void): void
  BackButton: TgButton
  HapticFeedback: {
    impactOccurred(s: HapticStyle): void
    notificationOccurred(t: NotifyType): void
    selectionChanged(): void
  }
}

const w = window as unknown as { Telegram?: { WebApp?: TgWebApp } }
export const tg: TgWebApp | undefined = w.Telegram?.WebApp
/** true — открыто внутри Telegram, false — обычный браузер */
export const isTelegram = !!tg?.initData

const WEB_USER_KEY = 'vpnhub.user'

/**
 * Профиль Telegram: в мини-аппе — из initData, в браузере — сохранённый
 * при входе через Telegram Login Widget (бэкенд имя и фото не хранит).
 */
export function getTgUser(): TgUser | undefined {
  if (isTelegram) return tg?.initDataUnsafe.user
  try {
    const raw = localStorage.getItem(WEB_USER_KEY)
    return raw ? (JSON.parse(raw) as TgUser) : undefined
  } catch {
    return undefined
  }
}

export function saveWebUser(u: TgUser | null) {
  try {
    if (u) {
      const { id, first_name, last_name, username, photo_url } = u
      localStorage.setItem(WEB_USER_KEY, JSON.stringify({ id, first_name, last_name, username, photo_url }))
    } else localStorage.removeItem(WEB_USER_KEY)
  } catch {
    /* хранилище недоступно — покажем «Гость» */
  }
}

export function getColorScheme(): 'light' | 'dark' {
  if (isTelegram && tg) return tg.colorScheme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTelegramChrome(bg: string) {
  if (!isTelegram || !tg) return
  try {
    if (tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor(bg)
      tg.setBackgroundColor(bg)
    }
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.(bg)
  } catch {
    /* старые клиенты */
  }
}

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.()
}

export const haptic = {
  tap(style: HapticStyle = 'light') {
    if (isTelegram && tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.impactOccurred(style)
  },
  select() {
    if (isTelegram && tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.selectionChanged()
  },
  notify(type: NotifyType) {
    if (isTelegram && tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.notificationOccurred(type)
  },
}

/** Показывает нативную кнопку «Назад» Telegram, пока смонтирована страница. */
export function useTelegramBackButton(onBack: (() => void) | null) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    if (!isTelegram || !tg || !onBack || !tg.isVersionAtLeast('6.1')) return
    const handler = () => ref.current?.()
    tg.BackButton.onClick(handler)
    tg.BackButton.show()
    return () => {
      tg.BackButton.offClick(handler)
      tg.BackButton.hide()
    }
  }, [!!onBack])
}

export function openSupport(url: string) {
  if (isTelegram && tg) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}

/**
 * Открывает страницу оплаты счёта. Счета Telegram Stars (t.me/$…) — нативным
 * окном оплаты, ссылки t.me — внутри Telegram, остальное — во внешнем браузере.
 */
export function openPayment(url: string) {
  if (isTelegram && tg) {
    if (/^https:\/\/t\.me\/(\$|invoice\/)/.test(url) && tg.openInvoice && tg.isVersionAtLeast('6.1')) tg.openInvoice(url)
    else if (url.startsWith('https://t.me/')) tg.openTelegramLink(url)
    else tg.openLink(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
