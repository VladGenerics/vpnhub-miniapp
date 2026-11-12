import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { IconType } from 'react-icons'
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa6'
import { LuMonitorSmartphone } from 'react-icons/lu'
import { useArticles } from '../api/queries'
import { currentPlatform, platformOf, type Platform } from '../lib/device'
import { haptic } from '../lib/telegram'

// однотонные значки: цветные плитки в ряд пестрили
const ICON: Record<Platform, IconType> = {
  ios: FaApple,
  macos: FaApple,
  android: FaAndroid,
  windows: FaWindows,
  linux: FaLinux,
  other: LuMonitorSmartphone,
}

/**
 * Кнопки инструкций по подключению: по статье «Инструкции» на платформу, как кнопка «Инструкции» в боте.
 * Платформа статьи - по адресу и заголовку (ios, Android, macOS...), кнопка устройства пользователя обведена.
 * Статей нет или они не загрузились - блока нет, ссылку подписки это не загораживает
 */
export function PlatformGuides({ className = 'section' }: { className?: string }) {
  const { data: guides } = useArticles('GUIDE')
  const [mine] = useState(currentPlatform)
  if (!guides?.length) return null
  return (
    <section className={className}>
      <h3 className="section-title">Инструкции по подключению</h3>
      <div className="guides">
        {guides.map((a) => {
          const platform = platformOf(`${a.slug} ${a.title}`)
          const current = platform !== 'other' && platform === mine
          const Icon = ICON[platform]
          return (
            <Link
              key={a.id}
              to={`/guide/${a.slug}`}
              state={{ back: true }}
              className={`guide-btn ${current ? 'is-current' : ''}`}
              aria-current={current ? 'true' : undefined}
              title={current ? 'Ваше устройство' : undefined}
              onClick={() => haptic.tap()}
            >
              <Icon size={20} aria-hidden />
              <span>{a.title}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
