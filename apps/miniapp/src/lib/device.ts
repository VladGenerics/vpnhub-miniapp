import type { DeviceSlot } from '@vpnhub/shared'

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux' | 'other'

export const PLATFORM_LABEL: Record<Platform, string> = {
  macos: 'macOS',
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  linux: 'Linux',
  other: 'Устройство',
}

/** Платформа из device_slots.platform (строка от клиента: «iOS», «android», «Windows» …) */
export function platformOf(raw: string | null): Platform {
  const p = (raw ?? '').toLowerCase()
  if (p.includes('mac') || p.includes('darwin')) return 'macos'
  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return 'ios'
  if (p.includes('android')) return 'android'
  if (p.includes('win')) return 'windows'
  if (p.includes('linux') || p.includes('ubuntu')) return 'linux'
  return 'other'
}

export const slotTitle = (s: DeviceSlot) => {
  const label = PLATFORM_LABEL[platformOf(s.platform)]
  return s.model ? `${label} | ${s.model}` : label
}
