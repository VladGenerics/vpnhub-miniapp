import type { DeviceSlot } from '@vpnhub/shared'
import { tg } from './telegram'

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux' | 'other'

export const PLATFORM_LABEL: Record<Platform, string> = {
  macos: 'macOS',
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  linux: 'Linux',
  other: 'Устройство',
}

/** Платформа из device_slots.platform, строка от клиента: iOS, android, Windows... */
export function platformOf(raw: string | null): Platform {
  const p = (raw ?? '').toLowerCase()
  if (p.includes('mac') || p.includes('darwin')) return 'macos'
  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return 'ios'
  if (p.includes('android')) return 'android'
  if (p.includes('win')) return 'windows'
  if (p.includes('linux') || p.includes('ubuntu')) return 'linux'
  return 'other'
}

/**
 * Платформа устройства, на котором открыт кабинет: сначала по Telegram (ios, android, macos),
 * для Telegram Desktop и браузера - по User-Agent. iPad с «настольным» UA узнаём по сенсорному экрану
 */
export function currentPlatform(): Platform {
  const fromTg = platformOf(tg?.platform ?? null)
  if (fromTg === 'ios' || fromTg === 'android' || fromTg === 'macos') return fromTg
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos'
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux'
  return 'other'
}

export const slotTitle = (s: DeviceSlot) => {
  const label = PLATFORM_LABEL[platformOf(s.platform)]
  return s.model ? `${label} | ${s.model}` : label
}
