import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLE_LABEL, type AdminUserRow, type UserFlag, type UserRole } from '@vpnhub/shared'
import { useUsers } from '../api/queries'
import { SubBadge, UserFlags } from '../components/badges'
import { DataTable, Pagination, type Column } from '../components/DataTable'
import { SearchInput } from '../components/SearchInput'
import { Card, CopyButton, ErrorView, PageHead } from '../components/ui'
import { useListParams } from '../hooks/useListParams'
import { dateTime, num, rub } from '../lib/format'

const FILTERS = ['role', 'flag'] as const

const FLAG_LABEL: Record<UserFlag, string> = {
  active_sub: 'С активной подпиской',
  trial: 'Брали пробный период',
  premium: 'Telegram Premium',
  blocked: 'Заблокировали бота',
  bot: 'Боты',
}

const columns: Column<AdminUserRow>[] = [
  { key: 'id', title: 'ID', sort: 'id', render: (u) => <span className="mono">{u.id}</span> },
  {
    key: 'tg',
    title: 'Telegram ID',
    sort: 'tg_user_id',
    render: (u) => (
      <span className="nowrap">
        <span className="mono">{u.tg_user_id}</span> <CopyButton value={u.tg_user_id} label="Telegram ID" />
      </span>
    ),
  },
  { key: 'reg', title: 'Регистрация', sort: 'registered_at', render: (u) => dateTime(u.registered_at) },
  { key: 'lang', title: 'Язык', render: (u) => (u.language_code ? <span className="mono">{u.language_code}</span> : <span className="muted">—</span>) },
  { key: 'balance', title: 'Баланс', sort: 'balance', num: true, render: (u) => (u.balance ? rub(u.balance) : <span className="muted">0 ₽</span>) },
  { key: 'sub', title: 'Подписка', sort: 'subscription_expires_at', render: (u) => <SubBadge status={u.subscription_status} expires={u.subscription_expires_at} /> },
  { key: 'refs', title: 'Рефералы', sort: 'referrals_count', num: true, render: (u) => (u.referrals_count ? num(u.referrals_count) : <span className="muted">0</span>) },
  { key: 'flags', title: 'Признаки', render: (u) => <UserFlags user={u} /> },
]

export function UsersPage() {
  const navigate = useNavigate()
  const { params, set } = useListParams({ sort: 'registered_at', order: 'desc' }, FILTERS)
  const query = { ...params, role: params.role as UserRole | undefined, flag: params.flag as UserFlag | undefined }
  const { data, error, isFetching, refetch } = useUsers(query)
  const onSearch = useCallback((q: string) => set({ q }), [set])

  return (
    <>
      <PageHead title="Пользователи" />
      <Card flush>
        <div className="toolbar">
          <SearchInput value={params.q ?? ''} onChange={onSearch} placeholder="ID, Telegram ID или язык (ru, en…)" label="Поиск пользователей" />
          <select className="select" value={params.role ?? ''} onChange={(e) => set({ role: e.target.value })} aria-label="Роль">
            <option value="">Все роли</option>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <select className="select" value={params.flag ?? ''} onChange={(e) => set({ flag: e.target.value })} aria-label="Признак">
            <option value="">Все пользователи</option>
            {(Object.keys(FLAG_LABEL) as UserFlag[]).map((f) => (
              <option key={f} value={f}>
                {FLAG_LABEL[f]}
              </option>
            ))}
          </select>
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
              rowKey={(u) => u.id}
              loading={!data}
              sort={params.sort}
              order={params.order}
              onSort={(sort, order) => set({ sort, order })}
              onRowClick={(u) => navigate(`/users/${u.id}`)}
              empty="Никого не нашли — попробуйте изменить запрос или фильтры"
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
