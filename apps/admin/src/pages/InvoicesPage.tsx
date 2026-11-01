import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { INVOICE_STATUS_LABEL, PROVIDER_LABEL, type AdminInvoiceRow, type InvoiceStatus, type PaymentProvider } from '@vpnhub/shared'
import { useInvoices } from '../api/queries'
import { InvoiceBadge } from '../components/badges'
import { DataTable, Pagination, type Column } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { SearchInput } from '../components/SearchInput'
import { Card, CopyButton, ErrorView, PageHead } from '../components/ui'
import { useListParams } from '../hooks/useListParams'
import { dateTime, fromDateInput, num, rub, toDateInput } from '../lib/format'
import { useStaleCutoff } from '../lib/invoices'

/** from/to — дни включительно (yyyy-mm-dd), by=paid — по дате оплаты, stale=1 — зависшие неоплаченные */
const FILTERS = ['status', 'provider', 'user_id', 'from', 'to', 'by', 'stale'] as const

const iso = (ms: number) => new Date(ms).toISOString()
/** Начало следующего дня — календарно: в день перевода часов сутки не 24 ч */
const dayAfter = (v: string) => {
  const d = new Date(fromDateInput(v))
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

const columns: Column<AdminInvoiceRow>[] = [
  { key: 'id', title: 'Счёт', sort: 'id', render: (i) => <span className="mono">#{i.id}</span> },
  {
    key: 'user',
    title: 'Пользователь',
    render: (i) => (
      <Link className="link" to={`/users/${i.user_id}`} onClick={(e) => e.stopPropagation()}>
        #{i.user_id} <span className="muted mono">· {i.user_tg_id}</span>
      </Link>
    ),
  },
  { key: 'amount', title: 'Сумма', sort: 'amount', num: true, render: (i) => <b>{rub(i.amount)}</b> },
  { key: 'provider', title: 'Способ', render: (i) => PROVIDER_LABEL[i.provider] },
  { key: 'status', title: 'Статус', render: (i) => <InvoiceBadge status={i.status} created={i.created_at} /> },
  { key: 'created', title: 'Создан', sort: 'created_at', render: (i) => dateTime(i.created_at) },
  { key: 'paid', title: 'Оплачен', sort: 'paid_at', render: (i) => (i.paid_at ? dateTime(i.paid_at) : <span className="muted">—</span>) },
  {
    key: 'ext',
    title: 'Внешний ID',
    render: (i) =>
      i.external_invoice_id ? (
        <span className="nowrap">
          <span className="mono muted">{i.external_invoice_id}</span> <CopyButton value={i.external_invoice_id} label="Внешний ID" />
        </span>
      ) : (
        <span className="muted">—</span>
      ),
  },
]

export function InvoicesPage() {
  const { params, set } = useListParams({ sort: 'created_at', order: 'desc' }, FILTERS)
  const navigate = useNavigate()
  const cutoff = useStaleCutoff()
  const stale = params.stale === '1'
  const { from: fromDay, to: toDay, by, stale: _stale, ...rest } = params
  const query = {
    ...rest,
    status: (stale ? 'UNPAID' : params.status) as InvoiceStatus | undefined,
    provider: params.provider as PaymentProvider | undefined,
    user_id: params.user_id ? Number(params.user_id) : undefined,
    from: !stale && fromDay ? iso(fromDateInput(fromDay)) : undefined,
    to: stale ? iso(cutoff) : toDay ? iso(dayAfter(toDay)) : undefined,
    date_by: !stale && by === 'paid' ? ('paid' as const) : undefined,
  }
  const { data, error, isFetching, refetch } = useInvoices(query)
  const onSearch = useCallback((q: string) => set({ q }), [set])
  const today = toDateInput(Date.now())
  // ручной выбор статуса или дат снимает «зависшие»: это отдельный готовый срез
  const setFilter = (patch: Parameters<typeof set>[0]) => set({ ...patch, stale: undefined })

  return (
    <>
      <PageHead title="Счета" />
      <Card flush>
        <div className="toolbar">
          <SearchInput value={params.q ?? ''} onChange={onSearch} placeholder="Счёт, ID или Telegram ID, внешний ID" label="Поиск счетов" />
          <select className="select" value={stale ? 'UNPAID' : (params.status ?? '')} onChange={(e) => setFilter({ status: e.target.value })} aria-label="Статус">
            <option value="">Все статусы</option>
            {(Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select className="select" value={params.provider ?? ''} onChange={(e) => set({ provider: e.target.value })} aria-label="Платёжная система">
            <option value="">Все способы</option>
            {(Object.keys(PROVIDER_LABEL) as PaymentProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </option>
            ))}
          </select>
          <div className="date-range" role="group" aria-label="Период">
            <select className="select" value={by === 'paid' ? 'paid' : 'created'} onChange={(e) => setFilter({ by: e.target.value === 'paid' ? 'paid' : undefined })} aria-label="По какой дате">
              <option value="created">Созданы</option>
              <option value="paid">Оплачены</option>
            </select>
            <input
              className="input"
              type="date"
              aria-label="С даты"
              max={toDay || today}
              value={stale ? '' : (fromDay ?? '')}
              onChange={(e) => setFilter({ from: e.target.value })}
            />
            <span className="muted">—</span>
            <input
              className="input"
              type="date"
              aria-label="По дату"
              min={fromDay}
              max={today}
              value={stale ? '' : (toDay ?? '')}
              onChange={(e) => setFilter({ to: e.target.value })}
            />
            {(fromDay || toDay) && !stale && (
              <button type="button" className="input-clear" aria-label="Сбросить период" onClick={() => set({ from: undefined, to: undefined })}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          {stale && (
            <button type="button" className="badge is-warn" onClick={() => set({ stale: undefined })} aria-label="Убрать фильтр зависших счетов">
              Ждут оплаты дольше часа <Icon name="close" size={12} />
            </button>
          )}
          {params.user_id && (
            <button type="button" className="badge is-accent" onClick={() => set({ user_id: undefined })} aria-label="Убрать фильтр по пользователю">
              Пользователь #{params.user_id} <Icon name="close" size={12} />
            </button>
          )}
          <div className="toolbar-right" aria-live="polite">
            {isFetching && data ? <span className="spinner" style={{ width: 14, height: 14 }} /> : data && `Найдено: ${num(data.total)}`}
          </div>
        </div>
        {error && !data ? (
          <ErrorView error={error} onRetry={refetch} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.items}
              rowKey={(i) => i.id}
              loading={!data}
              sort={params.sort}
              order={params.order}
              onSort={(sort, order) => set({ sort, order })}
              onRowClick={(i) => navigate(`/users/${i.user_id}`)}
              empty="Счетов под такие условия нет"
            />
            <Pagination
              page={params.page}
              pageSize={params.page_size}
              total={data?.total}
              onPage={(page) => {
                set({ page })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSize={(size) => set({ size })}
            />
          </>
        )}
      </Card>
    </>
  )
}
