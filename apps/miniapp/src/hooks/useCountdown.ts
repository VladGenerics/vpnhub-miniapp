import { useEffect, useRef, useState } from 'react'

/**
 * Остаток миллисекунд до момента `target`, обновляется раз в секунду
 * (тик выравнивается по границе секунды, чтобы цифры менялись ровно).
 * `onZero` вызывается один раз, когда отсчёт дошёл до нуля.
 */
export function useCountdown(target: string | Date, onZero?: () => void) {
  const end = +new Date(target)
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()))
  const cb = useRef(onZero)
  cb.current = onZero

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let fired = false
    const tick = () => {
      const ms = Math.max(0, end - Date.now())
      setLeft(ms)
      if (ms === 0) {
        if (!fired) {
          fired = true
          cb.current?.()
        }
        return
      }
      timer = setTimeout(tick, (ms % 1000) + 5)
    }
    tick()
    // после сна вкладки/телефона таймеры стоят — пересчитываем при возврате
    const onVisible = () => document.visibilityState === 'visible' && (clearTimeout(timer), tick())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [end])

  return left
}
