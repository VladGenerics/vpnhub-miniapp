import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { E } from '../data/emoji'
import { useToast } from './Toast'

/** Фоновое обновление не удалось, а на экране прежние данные - предупреждаем, что они могут быть неактуальны */
export function BackgroundErrors() {
  const qc = useQueryClient()
  const toast = useToast()
  useEffect(() => {
    let last = 0
    return qc.getQueryCache().subscribe((e) => {
      if (e.type !== 'updated' || e.action.type !== 'error' || e.query.state.data === undefined) return
      if ((e.action.error as { status?: number }).status === 401) return
      if (Date.now() - last < 15_000) return
      last = Date.now()
      toast('Нет связи с сервером, данные могут быть неактуальны', E.signal)
    })
  }, [qc, toast])
  return null
}
