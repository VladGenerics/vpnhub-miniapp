// Конфетти на радостных событиях: пробная подписка - спокойный дождь сверху,
// пополнение баланса - динамичный взрыв во все стороны, как при подарке в Telegram, чтобы пополнение запоминалось.
// Библиотека грузится отдельным чанком при первом показе, с «уменьшением движения» его нет
import type { Options } from 'canvas-confetti'

const RAIN_DURATION = 1500
const BURST_COUNT = 200

async function load(): Promise<((o: Options) => unknown) | null> {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null
  try {
    return (await import('canvas-confetti')).default
  } catch {
    return null // не загрузилось - праздник без конфетти, это не ошибка
  }
}

/** Область контента в долях экрана: на ПК без боковой панели */
function contentArea() {
  const main = document.querySelector('.app-main')?.getBoundingClientRect()
  return { left: main ? main.left / window.innerWidth : 0, width: main ? main.width / window.innerWidth : 1 }
}

/**
 * Пробная подписка: дождь из конфетти сверху по всей ширине страницы, каждая частица
 * из случайного места над экраном, около полутора секунд
 */
export async function celebrate() {
  const confetti = await load()
  if (!confetti) return
  const { left, width } = contentArea()
  const end = performance.now() + RAIN_DURATION
  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 270,
      spread: 70,
      startVelocity: 8,
      gravity: 0.7,
      drift: Math.random() - 0.5,
      ticks: 320,
      scalar: 0.9,
      origin: { x: left + Math.random() * width, y: -0.05 },
      zIndex: 10_000,
      disableForReducedMotion: true,
    })
    if (performance.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/**
 * Пополнение баланса: взрыв во все стороны, как при подарке в Telegram. Кольцо мелких кружков
 * и полосок разлетается из центра (эмодзи «Баланс пополнен» в окне счёта, иначе середина контента),
 * потом частицы медленно оседают. Три слоя с разной скоростью, чтобы взрыв был объёмным
 */
export async function celebrateBurst(from?: Element | null) {
  const confetti = await load()
  if (!confetti) return
  const r = from?.getBoundingClientRect()
  const { left, width } = contentArea()
  const origin = r?.width ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight } : { x: left + width / 2, y: 0.45 }
  const base: Options = { origin, spread: 360, ticks: 220, gravity: 0.55, decay: 0.92, zIndex: 10_000, disableForReducedMotion: true }
  confetti({ ...base, particleCount: Math.floor(BURST_COUNT * 0.55), startVelocity: 38, scalar: 0.8, shapes: ['circle'] })
  confetti({ ...base, particleCount: Math.floor(BURST_COUNT * 0.3), startVelocity: 28, scalar: 0.9, shapes: ['square'] })
  // внутреннее кольцо помедленнее: частицы остаются рядом с центром, как в Telegram
  confetti({ ...base, particleCount: Math.floor(BURST_COUNT * 0.15), startVelocity: 16, scalar: 0.7, shapes: ['circle'] })
}
