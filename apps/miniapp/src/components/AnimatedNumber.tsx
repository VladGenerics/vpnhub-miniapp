import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Сколько знаков после запятой у числа (до 2 - копейки) */
const decimalsOf = (n: number) => {
  const s = (Math.round(n * 100) / 100).toString()
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

/**
 * Число с плавной сменой значения. Точность в пути как у цели, from - стартовое значение при первом показе.
 * reserve - текст, под ширину которого держится место (например «0,00 ₽»), чтобы соседи не сдвигались
 */
export function AnimatedNumber({
  value,
  format = String,
  duration = 450,
  from,
  reserve,
}: {
  value: number
  format?(n: number): string
  duration?: number
  from?: number
  reserve?: string
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

  if (reserve === undefined) return <span className="anum">{format(shown)}</span>
  // под числом невидимо стоит самый широкий вариант: ширина не меняется в пути, соседи не дёргаются
  return (
    <span className="anum anum-reserved">
      <span aria-hidden="true">{reserve}</span>
      <span>{format(shown)}</span>
    </span>
  )
}
