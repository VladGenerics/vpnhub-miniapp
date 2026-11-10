import { resolveEmoji } from '@vpnhub/shared'
import { Lottie } from './Lottie'

/** Эмодзи по имени из паков, custom_emoji_id или обычный символ */
export function AppEmoji({
  value,
  fallback,
  size = 28,
  animate = 'hover',
  inline,
}: {
  value: string | null | undefined
  fallback?: string
  size?: number
  animate?: boolean | 'hover'
  inline?: boolean
}) {
  const r = resolveEmoji(value, fallback)
  if (r.lottie) return <Lottie name={r.lottie} size={size} animate={animate} className={inline ? 'is-inline' : undefined} />
  return (
    <span className={`text-emoji ${inline ? 'is-inline' : ''}`} style={inline ? undefined : { width: size, height: size, fontSize: Math.round(size * 0.8) }}>
      {r.text || '·'}
    </span>
  )
}
