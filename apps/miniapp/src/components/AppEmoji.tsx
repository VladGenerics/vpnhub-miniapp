import { resolveEmoji } from '@vpnhub/shared'
import { Lottie } from './Lottie'

/** Эмодзи по имени из паков, custom_emoji_id или обычный символ */
export function AppEmoji({ value, fallback, size = 28, inline }: { value: string | null | undefined; fallback?: string; size?: number; inline?: boolean }) {
  const r = resolveEmoji(value, fallback)
  if (r.lottie) return <Lottie name={r.lottie} size={size} inline={inline} />
  if (!r.text) return null
  return (
    <span
      className={`text-emoji ${inline ? 'is-inline' : ''}`}
      style={inline ? undefined : { width: size, height: size, fontSize: Math.round(size * 0.78) }}
      aria-hidden={!inline}
    >
      {r.text}
    </span>
  )
}
