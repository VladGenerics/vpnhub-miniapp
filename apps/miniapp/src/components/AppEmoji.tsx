import { resolveEmoji } from '@vpnhub/shared'
import { Lottie } from './Lottie'

/**
 * Эмодзи из данных (разделы, админка): имя анимированного эмодзи приложения, custom_emoji_id Telegram или обычный символ.
 * Анимация - если такой эмодзи есть в приложении (для ID - в CUSTOM_EMOJI_IDS), иначе обычный символ (fallback для ID)
 */
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
