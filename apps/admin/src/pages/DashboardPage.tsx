import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PROVIDER_LABEL, type AdminInvoiceRow, type AdminUserRow } from '@vpnhub/shared'
import { useDashboard, useInvoices } from '../api/queries'
import { InvoiceBadge, SubBadge, UserFlags } from '../components/badges'
import { DataTable, type Column } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { MiniBars } from '../components/MiniBars'
import { Card, change, CountUp, ErrorView, Kpi, PageHead, Trend } from '../components/ui'
import { dateTime, num, percent, relative, rub, rubCompact, toDateInput } from '../lib/format'
import { useStaleCutoff } from '../lib/invoices'

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
  { key: 'status', title: 'Статус', render: (i) => <InvoiceBadge status={i.status} created={i.created_at} /> },
  { key: 'created', title: 'Создан', render: (i) => <span title={dateTime(i.created_at)}>{relative(i.created_at)}</span> },
]

export function DashboardPage() {
  const { data: d, error, refetch } = useDashboard()
  const navigate = useNavigate()
  // день под курсором — общий для обоих графиков, чтобы сравнивать регистрации и пополнения за одну дату
  const [day, setDay] = useState<number | null>(null)
  // зависшие: не оплачены дольше часа — тем же списком счетов, отдельной ручки не нужно
  const cutoff = useStaleCutoff()
  const stale = useInvoices({ status: 'UNPAID', to: new Date(cutoff).toISOString(), page: 1, page_size: 1, sort: 'created_at', order: 'desc' }).data?.total
  const today = toDateInput(Date.now())
  const monthAgo = toDateInput(new Date(new Date().setDate(new Date().getDate() - 29)).getTime())
  /** Клик по дню пополнений — оплаченные счета этого дня */
  const openDay = (t: string) => {
    const d = toDateInput(Date.parse(t))
    navigate(`/invoices?status=PAID&by=paid&from=${d}&to=${d}`)
  }

  if (error && !d) return <ErrorView error={error} onRetry={refetch} />

  const newUsers30 = d?.daily.reduce((s, p) => s + p.new_users, 0) ?? 0
  // Неделя к неделе по полным дням: сегодняшний день ещё не закончился
  const week = (f: (p: NonNullable<typeof d>['daily'][number]) => number, back: number) =>
    d ? d.daily.slice(-1 - 7 * (back + 1), -1 - 7 * back).reduce((s, p) => s + f(p), 0) : 0
  const wow = (f: (p: NonNullable<typeof d>['daily'][number]) => number) => change(week(f, 0), week(f, 1))

  return (
    <div className="stack">
      <PageHead title="Обзор">
        <Link to="/statistics" className="btn btn-secondary">
          <Icon name="chart" />
          Вся статистика
        </Link>
      </PageHead>

      <div className="kpi-grid is-6">
        <Kpi
          icon="users"
          label="Пользователи"
          value={d && <CountUp value={d.users_total} format={num} />}
          note={d && `+${num(d.users_today)} сегодня`}
          trend={d && <Trend value={wow((p) => p.new_users)} hint="Новые за 7 дней к предыдущим 7 дням" />}
          spark={d?.daily.map((p) => p.new_users)}
          to="/users"
          toLabel="Открыть пользователей — новые сверху"
        />
        <Kpi
          icon="shield"
          label="Активные подписки"
          to="/users?flag=active_sub"
          toLabel="Открыть пользователей с активной подпиской"
          value={d && <CountUp value={d.subscriptions_active} format={num} />}
          note={d && `${percent(d.subscriptions_active, d.users_total)} от всех`}
        />
        <Kpi
          icon="wallet"
          label="Пополнения сегодня"
          value={d && <CountUp value={d.deposits_today} format={rub} />}
          note={d && `за 30 дней: ${rubCompact(d.deposits_30d)}`}
          trend={d && <Trend value={wow((p) => p.deposits)} hint="Пополнения за 7 дней к предыдущим 7 дням" />}
          spark={d?.daily.map((p) => p.deposits)}
          sparkColor="var(--success)"
          to={`/invoices?status=PAID&by=paid&from=${today}&to=${today}`}
          toLabel="Открыть оплаченные счета за сегодня"
        />
        <Kpi
          icon="receipt"
          label="Покупки за 30 дней"
          to={`/statistics/purchases?g=day&from=${monthAgo}&to=${today}`}
          toLabel="Открыть статистику покупок за 30 дней"
          value={d && <CountUp value={d.purchases_30d_count} format={num} />}
          note={d && `на ${rubCompact(d.purchases_30d_amount)}`}
        />
        <Kpi
          icon="trendDown"
          label="Заблокировали бота"
          to="/users?flag=blocked"
          toLabel="Открыть пользователей, заблокировавших бота"
          value={d && <CountUp value={d.users_blocked} format={num} />}
          note={d && `${percent(d.users_blocked, d.users_total)} · ботов ${num(d.users_bots)}`}
        />
        <Kpi
          icon="card"
          label="Ждут оплаты"
          to="/invoices?status=UNPAID"
          toLabel="Открыть неоплаченные счета"
          value={d && <CountUp value={d.invoices_unpaid} format={num} />}
          note={
            stale ? (
              <Link className="link link-warn" to="/invoices?stale=1" title="Не оплачены дольше часа — стоит проверить платёжные системы">
                {num(stale)} дольше часа
              </Link>
            ) : (
              'неоплаченные счета'
            )
          }
        />
      </div>

      <div className="grid-2">
        <Card title="Новые пользователи" sub="по дням, последние 30 дней">
          {d ? (
            <MiniBars points={d.daily.map((p) => ({ t: p.t, v: p.new_users }))} format={num} total={num(newUsers30)} active={day} onActive={setDay} />
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </Card>
        <Card title="Пополнения" sub="оплаченные счета по дням">
          {d ? (
            <MiniBars
              points={d.daily.map((p) => ({ t: p.t, v: p.deposits }))}
              format={rub}
              total={rub(d.deposits_30d)}
              color="var(--success)"
              active={day}
              onActive={setDay}
              onPick={(i) => openDay(d.daily[i].t)}
              pickHint="счета за день"
            />
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
