import { useEffect, useState } from 'react'

/**
 * Неоплаченный счёт старше часа считаем зависшим: обычно платёжка подтверждает оплату за минуты,
 * а счёт без оплаты истекает. Висящий дольше — повод проверить платёжную систему.
 */
export const STALE_MS = 36e5

export const isStale = (i: { status: string; created_at: string }, now = Date.now()) =>
  i.status === 'UNPAID' && now - Date.parse(i.created_at) > STALE_MS

/** «3 ч», «2 дн» — сколько счёт уже ждёт */
export function waited(created_at: string, now = Date.now()) {
  const h = Math.floor((now - Date.parse(created_at)) / 36e5)
  return h < 24 ? `${h} ч` : `${Math.floor(h / 24)} дн`
}

/**
 * Граница «зависших» для запроса: сейчас минус час, округлено до минуты и обновляется раз в минуту —
 * иначе ключ запроса менялся бы на каждый рендер и список перезапрашивался без конца.
 */
export function useStaleCutoff() {
  const calc = () => Math.floor(Date.now() / 6e4) * 6e4 - STALE_MS
  const [cutoff, setCutoff] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setCutoff(calc), 6e4)
    return () => clearInterval(id)
  }, [])
  return cutoff
}
