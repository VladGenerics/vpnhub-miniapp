import type { ReactNode } from 'react'
import type { SortOrder } from '@vpnhub/shared'
import { num } from '../lib/format'
import { Icon } from './Icon'
import { Skeleton } from './ui'

export interface Column<T> {
  key: string
  title: ReactNode
  render(row: T): ReactNode
  /** Поле сортировки на бэкенде; без него колонка не сортируется */
  sort?: string
  /** Числовая колонка — выравнивание вправо */
  num?: boolean
}

/**
 * Таблица со страничной загрузкой: сортировку, поиск и страницы считает бэкенд,
 * таблица только показывает текущую страницу и сообщает, что выбрал пользователь.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  sort,
  order,
  onSort,
  onRowClick,
  empty = 'Ничего не найдено',
  skeletonRows = 8,
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey(row: T): string | number
  loading?: boolean
  sort?: string
  order?: SortOrder
  onSort?(sort: string, order: SortOrder): void
  onRowClick?(row: T): void
  empty?: ReactNode
  skeletonRows?: number
}) {
  const header = (c: Column<T>) => {
    if (!c.sort || !onSort) return c.title
    const active = sort === c.sort
    const next: SortOrder = active && order === 'desc' ? 'asc' : 'desc'
    return (
      <button type="button" className={`th-sort ${active ? 'is-sorted' : ''}`} onClick={() => onSort(c.sort!, next)}>
        {c.title}
        <Icon name={active ? (order === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'} size={14} />
      </button>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={c.num ? 'is-num' : undefined}
                aria-sort={c.sort && sort === c.sort ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {header(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="table-skeleton">
                  {columns.map((c) => (
                    <td key={c.key}>
                      <Skeleton width={`${50 + ((i * 7 + c.key.length * 13) % 40)}%`} />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((r) => (
                <tr
                  key={rowKey(r)}
                  className={onRowClick ? 'is-clickable' : undefined}
                  onClick={onRowClick && (() => onRowClick(r))}
                  // строка открывается и с клавиатуры: Tab до строки, затем Enter
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick && ((e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(r))}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.num ? 'is-num' : undefined}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const PAGE_SIZES = [20, 50, 100]

/** Номера страниц с многоточиями: 1 … 4 5 [6] 7 8 … 40 */
function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p))
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((p) => set.add(p))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: number
  total: number | undefined
  onPage(p: number): void
  onPageSize?(s: number): void
}) {
  if (total === undefined) return <div className="pagination">&nbsp;</div>
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  return (
    <nav className="pagination" aria-label="Страницы">
      <span className="num">
        {num(from)}–{num(to)} из {num(total)}
      </span>
      {onPageSize && (
        <select className="select" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Строк на странице">
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              по {s}
            </option>
          ))}
        </select>
      )}
      <div className="pagination-pages">
        <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Предыдущая страница">
          <Icon name="chevronLeft" size={16} />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="page-btn" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page-btn ${p === page ? 'is-active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className="page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Следующая страница">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </nav>
  )
}
