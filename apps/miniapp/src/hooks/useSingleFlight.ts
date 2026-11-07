import { useCallback, useRef } from 'react'

/**
 * Синхронный замок для денежных операций: isPending у мутации ставится только после перерисовки,
 * и два нажатия в одной задаче успели бы отправить две покупки. Пока операция идёт, повторный вызов молча пропускается.
 * run(start) вызывает start(done); done снимает замок, его передают в onSettled
 */
export function useSingleFlight() {
  const busy = useRef(false)
  return useCallback((start: (done: () => void) => void) => {
    if (busy.current) return
    busy.current = true
    start(() => {
      busy.current = false
    })
  }, [])
}
