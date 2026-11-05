import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SortOrder } from '@vpnhub/shared'

const pageFrom = (raw: string | null) => {
  const n = Math.floor(Number(raw))
  return Number.isSafeInteger(n) && n >= 1 && n <= 1_000_000 ? n : 1
}

/** Размеры страницы, которые предлагает таблица. Другое значение из адреса заменяем на значение по умолчанию */
const PAGE_SIZES = [10, 20, 50, 100]

// Параметры списка (страница, сортировка, поиск, фильтры) хранятся в адресе: ссылку можно скинуть
// коллеге, а «Назад» из карточки вернёт к той же выборке. filters держать константой модуля.
export function useListParams<F extends string>(defaults: { sort: string; order: SortOrder; page_size?: number }, filters: readonly F[]) {
  const [sp, setSp] = useSearchParams()

  const params = useMemo(() => {
    const f = {} as Record<F, string | undefined>
    for (const k of filters) f[k] = sp.get(k) || undefined
    return {
      // мусор и огромные числа в адресе (page=abc, page=Infinity) - первая страница
      page: pageFrom(sp.get('page')),
      page_size: PAGE_SIZES.includes(Number(sp.get('size'))) ? Number(sp.get('size')) : defaults.page_size || 20,
      sort: sp.get('sort') || defaults.sort,
      order: (sp.get('order') === 'asc' ? 'asc' : sp.get('order') === 'desc' ? 'desc' : defaults.order) as SortOrder,
      q: sp.get('q') || undefined,
      ...f,
    }
  }, [sp, defaults.sort, defaults.order, defaults.page_size, filters])

  /** Любое изменение, кроме страницы, возвращает на первую страницу */
  const set = useCallback(
    (patch: Partial<Record<'page' | 'size' | 'sort' | 'order' | 'q' | F, string | number | undefined>>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '') next.delete(k)
            else next.set(k, String(v))
          }
          if (!('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSp],
  )

  return { params, set }
}
