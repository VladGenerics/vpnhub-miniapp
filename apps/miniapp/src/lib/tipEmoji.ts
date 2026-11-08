import { useEffect, useState } from 'react'
import { USE_MOCKS } from '../api'
import { E } from '../data/emoji'

// Анимированный эмодзи из паков (имя как у <Lottie name>) в начале подсказок (Tooltip), '' - без него.
// На тестовых данных его можно поменять из панели состояний, в боевой сборке берётся только TIP_EMOJI
export const TIP_EMOJI: string = E.warning

const KEY = 'vpnhub.tip-emoji'
const EVENT = 'vpnhub:tip-emoji'

function read() {
  if (!USE_MOCKS) return TIP_EMOJI
  try {
    return localStorage.getItem(KEY) ?? TIP_EMOJI
  } catch {
    return TIP_EMOJI
  }
}

export function setTipEmoji(emoji: string) {
  try {
    localStorage.setItem(KEY, emoji)
  } catch {
    // без хранилища: действует до перезагрузки через событие
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: emoji }))
}

/** Текущий эмодзи подсказок: обновляется сразу, как его поменяли в панели */
export function useTipEmoji() {
  const [emoji, setEmoji] = useState(read)
  useEffect(() => {
    const on = (e: Event) => setEmoji((e as CustomEvent<string>).detail)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return emoji
}
