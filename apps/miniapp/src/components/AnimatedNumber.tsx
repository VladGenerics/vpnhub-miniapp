import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Сколько знаков после запятой у числа (до 2 - копейки) */
const decimalsOf = (n: number) => {
  const s = (Math.round(n * 100) / 100).toString()
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

/**
 * Число, плавно докручивающееся до нового значения.
 * - В пути показывается с той же точностью, что и цель: к 841,54 идёт 830,12 → 838,90 → 841,54,
 *   а не целые рубли с прыжком на копейки в конце (так было: 842, потом 841,54).
 * - Если цель меняется на ходу (зажали «+» у дней), счёт продолжается от того, что уже на экране,
 *   без сброса и мигания - выглядит как один непрерывный отсчёт.
 * - from - с чего начать при первом показе (баланс набегает от нуля)
 */
export function AnimatedNumber({
  value,
  format = String,
  duration = 450,
  from,
}: {
  value: number
  format?(n: number): string
  duration?: number
  from?: number
}) {
  const [shown, setShown] = useState(from ?? value)
  const current = useRef(from ?? value)
  const raf = useRef(0)

  useEffect(() => {
    const start = current.current
    cancelAnimationFrame(raf.current)
    if (start === value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value
      setShown(value)
      return
    }
    const k = 10 ** decimalsOf(value)
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const v = p >= 1 ? value : Math.round((start + (value - start) * easeOut(p)) * k) / k
      current.current = v
      setShown(v)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [value, duration])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return <span className="anum">{format(shown)}</span>
}
