import type { IconType } from 'react-icons'
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa6'
import { LuMonitorSmartphone } from 'react-icons/lu'
import type { Platform } from '../lib/device'

// Нейтральная плитка и однотонный логотип, как у кнопок инструкций: фирменные градиенты в списке пестрили
const LOGO: Record<Platform, IconType> = {
  macos: FaApple,
  ios: FaApple,
  android: FaAndroid,
  windows: FaWindows,
  linux: FaLinux,
  other: LuMonitorSmartphone,
}

export function DeviceIcon({ platform, size = 40 }: { platform: Platform; size?: number }) {
  const Logo = LOGO[platform]
  return (
    <span className="device-icon" style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      <Logo size={size * 0.48} aria-hidden />
    </span>
  )
}
