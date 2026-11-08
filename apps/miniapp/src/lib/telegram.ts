import { useEffect, useRef } from 'react'

// Типы Telegram WebApp, только то, что используем
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
  close(): void
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
/** Открыто внутри Telegram */
export const isTelegram = !!tg?.initData

const WEB_USER_KEY = 'vpnhub.user'

// Профиль Telegram: в мини-аппе из initData, в браузере - сохранённый при входе
// (имя и фото бэкенд не хранит).
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
    /* хранилище недоступно, покажем «Гость» */
  }
}

export function getColorScheme(): 'light' | 'dark' {
  if (isTelegram && tg) return tg.colorScheme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTelegramChrome(bg: string) {
  if (!isTelegram || !tg) return
  // каждый вызов отдельно: ошибка одного не должна отменять остальные.
  // Шапка принимает произвольный hex только с 6.9, раньше - лишь имена цветов темы Telegram
  const run = (fn: () => void) => {
    try {
      fn()
    } catch {
      /* старые клиенты */
    }
  }
  if (tg.isVersionAtLeast('6.9')) run(() => tg!.setHeaderColor(bg))
  else if (tg.isVersionAtLeast('6.1')) run(() => tg!.setHeaderColor('bg_color'))
  if (tg.isVersionAtLeast('6.1')) run(() => tg!.setBackgroundColor(bg))
  if (tg.isVersionAtLeast('7.10')) run(() => tg!.setBottomBarColor?.(bg))
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

// Стек обработчиков родной «Назад»: срабатывает только верхний. Открытое окно поверх страницы
// закрывается первым, а страница получает кнопку обратно, когда окно закрыли
const backStack: { run(): void }[] = []
let backListener: (() => void) | null = null

function syncBackButton() {
  if (!tg) return
  if (backStack.length) {
    if (!backListener) {
      backListener = () => backStack[backStack.length - 1]?.run()
      tg.BackButton.onClick(backListener)
    }
    tg.BackButton.show()
  } else {
    if (backListener) tg.BackButton.offClick(backListener)
    backListener = null
    tg.BackButton.hide()
  }
}

/** Родная кнопка «Назад» Telegram, пока компонент смонтирован и onBack задан */
export function useTelegramBackButton(onBack: (() => void) | null) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    if (!isTelegram || !tg || !onBack || !tg.isVersionAtLeast('6.1')) return
    const entry = { run: () => ref.current?.() }
    backStack.push(entry)
    syncBackButton()
    return () => {
      const i = backStack.indexOf(entry)
      if (i >= 0) backStack.splice(i, 1)
      syncBackButton()
    }
  }, [!!onBack])
}

/**
 * Внешняя ссылка из API (оплата, поддержка) или null, если ей нельзя доверять.
 * Пускаем только https, а http - лишь на свой же сайт (заглушка оплаты в тестовых данных).
 * tg://resolve?domain=name переводим в https://t.me/name.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol === 'tg:') {
    const domain = url.hostname === 'resolve' ? url.searchParams.get('domain') : null
    return domain && /^\w{4,32}$/.test(domain) ? `https://t.me/${domain}` : null
  }
  if (url.protocol === 'https:') return url.href
  if (url.protocol === 'http:' && url.origin === location.origin) return url.href
  return null
}

/** Ссылки t.me Telegram открывает у себя, остальные - во внешнем браузере */
export function openSupport(raw: string) {
  const url = safeExternalUrl(raw)
  if (!url) return false
  if (isTelegram && tg) {
    if (url.startsWith('https://t.me/')) tg.openTelegramLink(url)
    else tg.openLink(url)
  } else window.open(url, '_blank', 'noopener')
  return true
}

// Открывает оплату счёта: Telegram Stars (t.me/$...) - родным окном, ссылки t.me - внутри Telegram,
// остальное - во внешнем браузере.
/** Событие «открыть тестовую оплату слоем», ловит TestPayOverlay (только тестовые данные) */
export const TEST_PAY_EVENT = 'vpnhub:test-pay'

export function openPayment(url: string) {
  // заглушка оплаты на своём сайте: в Telegram открываем внутри мини-аппа, иначе браузер не передаст итог
  if (isTelegram && url.startsWith(`${location.origin}${import.meta.env.BASE_URL}test-pay`)) {
    window.dispatchEvent(new CustomEvent(TEST_PAY_EVENT, { detail: url }))
    return
  }
  if (isTelegram && tg) {
    if (/^https:\/\/t\.me\/(\$|invoice\/)/.test(url) && tg.openInvoice && tg.isVersionAtLeast('6.1')) tg.openInvoice(url)
    else if (url.startsWith('https://t.me/')) tg.openTelegramLink(url)
    else tg.openLink(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
