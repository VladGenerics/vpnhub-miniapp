import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

/** Число, плавно докручивающееся до нового значения */
export function AnimatedNumber({ value, format = String, duration = 700, from }: { value: number; format?(n: number): string; duration?: number; from?: number }) {
  const [shown, setShown] = useState(from ?? value)
  const current = useRef(from ?? value)
  const [bump, setBump] = useState(0)

  useEffect(() => {
    const start = current.current
    if (start === value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value
      setShown(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const v = Math.round(start + (value - start) * easeOut(p))
      current.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    setBump((b) => b + 1)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <span className="anum" key={bump}>
      {format(shown)}
    </span>
  )
}
