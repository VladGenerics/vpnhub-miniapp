import { Link, useNavigate } from 'react-router-dom'
import { PROVIDER_LABEL, type AdminInvoiceRow, type AdminUserRow } from '@vpnhub/shared'
import { useDashboard } from '../api/queries'
import { InvoiceBadge, SubBadge, UserFlags } from '../components/badges'
import { DataTable, type Column } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { MiniBars } from '../components/MiniBars'
import { Card, ErrorView, Kpi, PageHead } from '../components/ui'
import { dateTime, num, percent, relative, rub, rubCompact } from '../lib/format'

const userCols: Column<AdminUserRow>[] = [
  { key: 'id', title: 'ID', render: (u) => <span className="mono">{u.id}</span> },
  { key: 'tg', title: 'Telegram ID', render: (u) => <span className="mono">{u.tg_user_id}</span> },
  { key: 'reg', title: 'Регистрация', render: (u) => <span title={dateTime(u.registered_at)}>{relative(u.registered_at)}</span> },
  { key: 'flags', title: 'Признаки', render: (u) => <UserFlags user={u} /> },
  { key: 'sub', title: 'Подписка', render: (u) => <SubBadge status={u.subscription_status} expires={u.subscription_expires_at} /> },
]

const invoiceCols: Column<AdminInvoiceRow>[] = [
  { key: 'id', title: 'Счёт', render: (i) => <span className="mono">#{i.id}</span> },
  { key: 'amount', title: 'Сумма', num: true, render: (i) => rub(i.amount) },
  { key: 'provider', title: 'Способ', render: (i) => PROVIDER_LABEL[i.provider] },
  { key: 'status', title: 'Статус', render: (i) => <InvoiceBadge status={i.status} /> },
  { key: 'created', title: 'Создан', render: (i) => <span title={dateTime(i.created_at)}>{relative(i.created_at)}</span> },
]

export function DashboardPage() {
  const { data: d, error, refetch } = useDashboard()
  const navigate = useNavigate()

  if (error && !d) return <ErrorView error={error} onRetry={refetch} />

  const newUsers30 = d?.daily.reduce((s, p) => s + p.new_users, 0) ?? 0

  return (
    <div className="stack">
      <PageHead title="Обзор">
        <Link to="/statistics" className="btn btn-secondary">
          <Icon name="chart" />
          Вся статистика
        </Link>
      </PageHead>

      <div className="kpi-grid is-6">
        <Kpi icon="users" label="Пользователи" value={d && num(d.users_total)} note={d && `+${num(d.users_today)} сегодня`} />
        <Kpi icon="shield" label="Активные подписки" value={d && num(d.subscriptions_active)} note={d && `${percent(d.subscriptions_active, d.users_total)} от всех`} />
        <Kpi icon="wallet" label="Пополнения сегодня" value={d && rub(d.deposits_today)} note={d && `за 30 дней: ${rubCompact(d.deposits_30d)}`} />
        <Kpi icon="receipt" label="Покупки за 30 дней" value={d && num(d.purchases_30d_count)} note={d && `на ${rubCompact(d.purchases_30d_amount)}`} />
        <Kpi icon="trendDown" label="Заблокировали бота" value={d && num(d.users_blocked)} note={d && `${percent(d.users_blocked, d.users_total)} · ботов ${num(d.users_bots)}`} />
        <Kpi icon="card" label="Ждут оплаты" value={d && num(d.invoices_unpaid)} note="неоплаченные счета" />
      </div>

      <div className="grid-2">
        <Card title="Новые пользователи" sub="по дням, последние 30 дней">
          {d ? (
            <MiniBars points={d.daily.map((p) => ({ t: p.t, v: p.new_users }))} format={num} total={num(newUsers30)} />
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </Card>
        <Card title="Пополнения" sub="оплаченные счета по дням">
          {d ? (
            <MiniBars points={d.daily.map((p) => ({ t: p.t, v: p.deposits }))} format={rub} total={rub(d.deposits_30d)} color="var(--success)" />
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card
          title="Последние регистрации"
          flush
          right={
            <Link to="/users" className="card-link">
              Все пользователи <Icon name="chevronRight" size={16} />
            </Link>
          }
        >
          <DataTable
            columns={userCols}
            rows={d?.latest_users}
            rowKey={(u) => u.id}
            loading={!d}
            skeletonRows={6}
            onRowClick={(u) => navigate(`/users/${u.id}`)}
          />
        </Card>
        <Card
          title="Последние счета"
          flush
          right={
            <Link to="/invoices" className="card-link">
              Все счета <Icon name="chevronRight" size={16} />
            </Link>
          }
        >
          <DataTable
            columns={invoiceCols}
            rows={d?.latest_invoices}
            rowKey={(i) => i.id}
            loading={!d}
            skeletonRows={6}
            onRowClick={(i) => navigate(`/users/${i.user_id}`)}
          />
        </Card>
      </div>
    </div>
  )
}
