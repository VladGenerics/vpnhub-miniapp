import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from './Toast'

/**
 * Фоновое обновление не удалось, а на экране остались прежние данные: страница их показывает как есть,
 * поэтому предупреждаем всплывашкой. Ошибки без данных страницы показывают сами (ErrorView).
 */
export function BackgroundErrors() {
  const qc = useQueryClient()
  const toast = useToast()
  useEffect(() => {
    let last = 0
    return qc.getQueryCache().subscribe((e) => {
      if (e.type !== 'updated' || e.action.type !== 'error' || e.query.state.data === undefined) return
      // 401 уводит на вход, о нём говорить незачем
      if ((e.action.error as { status?: number }).status === 401) return
      if (Date.now() - last < 15_000) return
      last = Date.now()
      toast('Не удалось обновить данные, показаны последние загруженные', 'error')
    })
  }, [qc, toast])
  return null
}
