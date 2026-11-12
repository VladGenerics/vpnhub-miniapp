// Конфетти на радостных событиях: пробная подписка, пополнение баланса.
// Дождь сверху по ширине страницы, около полутора секунд, без хлопков
// Библиотека грузится отдельным чанком при первом показе, с «уменьшением движения» его нет
import type { Options } from 'canvas-confetti'

const DURATION = 1500

async function load(): Promise<((o: Options) => unknown) | null> {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null
  try {
    return (await import('canvas-confetti')).default
  } catch {
    return null // не загрузилось - праздник без конфетти, это не ошибка
  }
}

/**
 * Дождь из конфетти сверху по всей ширине страницы, как подарок в Telegram: каждая частица
 * из случайного места над экраном, без пушки из одной точки. На ПК - над контентом, не над боковой панелью
 */
export async function celebrate() {
  const confetti = await load()
  if (!confetti) return
  const main = document.querySelector('.app-main')?.getBoundingClientRect()
  const left = main ? main.left / window.innerWidth : 0
  const width = main ? main.width / window.innerWidth : 1
  const end = performance.now() + DURATION
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
