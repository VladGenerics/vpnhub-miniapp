import type { IconType } from 'react-icons'
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa6'
import { LuMonitorSmartphone } from 'react-icons/lu'
import type { Platform } from '../lib/device'

// Плитки в фирменных цветах, как иконки в настройках iOS
const TILE: Record<Platform, { bg: string; ink: string; Logo: IconType }> = {
  macos: { bg: 'linear-gradient(160deg,#55595f,#1f2125)', ink: '#fff', Logo: FaApple },
  ios: { bg: 'linear-gradient(160deg,#ffffff,#d5d8de)', ink: '#1c1d21', Logo: FaApple },
  android: { bg: 'linear-gradient(160deg,#4ee39a,#1f9e5f)', ink: '#fff', Logo: FaAndroid },
  windows: { bg: 'linear-gradient(160deg,#3aa0ff,#0063d1)', ink: '#fff', Logo: FaWindows },
  linux: { bg: 'linear-gradient(160deg,#ffd35c,#f29a12)', ink: '#1c1d21', Logo: FaLinux },
  other: { bg: 'linear-gradient(160deg,#8a97a8,#4d5868)', ink: '#fff', Logo: LuMonitorSmartphone },
}

export function DeviceIcon({ platform, size = 40 }: { platform: Platform; size?: number }) {
  const { bg, ink, Logo } = TILE[platform]
  return (
    <span className="device-icon" style={{ background: bg, color: ink, width: size, height: size, borderRadius: size * 0.28 }}>
      <Logo size={size * 0.54} aria-hidden />
    </span>
  )
}
