import { useEffect, useState } from 'react'

/** Значение, которое обновляется через ms после последнего изменения (поиск по мере ввода) */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
