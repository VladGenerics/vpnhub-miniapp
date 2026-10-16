import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** ПК: широкий экран и точный указатель — диалоги показываем модалкой */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px) and (pointer: fine)')
