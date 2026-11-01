import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  LEDGER_TYPE_LABEL,
  PROVIDER_LABEL,
  ROLE_LABEL,
  type AdminInvoiceRow,
  type AdminUserDetails,
  type LedgerDirection,
  type LedgerEntry,
  type ReferralRow,
  type SortOrder,
} from '@vpnhub/shared'
import { useAdjustBalance, useInvoices, useLedger, useReferrals, useUser } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { InvoiceBadge, SubBadge, UserFlags } from '../components/badges'
import { DataTable, Pagination, type Column } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { sectionListPath } from '../components/Layout'
import { Segmented } from '../components/Segmented'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, CopyButton, ErrorView, Field, Modal, Skeleton, useMoneyInput } from '../components/ui'
import { date, dateTime, num, percent, relative, rub } from '../lib/format'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MAX_ADJUST = 1_000_000

/* ---------- Таблицы вкладок ---------- */

const referralCols: Column<ReferralRow>[] = [
  { key: 'id', title: 'ID', sort: 'id', render: (r) => <span className="mono">{r.id}</span> },
  { key: 'tg', title: 'Telegram ID', render: (r) => <span className="mono">{r.tg_user_id}</span> },
  { key: 'invited', title: 'Приглашён', sort: 'invited_at', render: (r) => dateTime(r.invited_at) },
  { key: 'trial', title: 'Пробный', render: (r) => (r.has_used_trial_subscription ? <Badge tone="success">Активировал</Badge> : <span className="muted">—</span>) },
  { key: 'sub', title: 'Подписка', render: (r) => <SubBadge status={r.subscription_status} /> },
  { key: 'bot', title: 'Бот', render: (r) => (r.is_blocked_bot ? <Badge tone="warn">Заблокировал</Badge> : <span className="muted">Активен</span>) },
  { key: 'dep', title: 'Пополнил', sort: 'deposits_total', num: true, render: (r) => (r.deposits_total ? rub(r.deposits_total) : <span className="muted">0 ₽</span>) },
]

const OUT_TYPES = new Set(['PURCHASE_VPN', 'PURCHASE_ADDITIONAL_DEVICE_SLOTS', 'ADMIN_DEDUCT'])

const ledgerCols: Column<LedgerEntry>[] = [
  { key: 'date', title: 'Дата', render: (l) => dateTime(l.created_at) },
  { key: 'type', title: 'Операция', render: (l) => LEDGER_TYPE_LABEL[l.entry_type] },
  {
    key: 'source',
    title: 'Источник',
    render: (l) => (l.source_type && l.source_id ? <span className="mono muted">{l.source_type === 'INVOICE' ? `Счёт #${l.source_id}` : `Покупка #${l.source_id}`}</span> : <span className="muted">—</span>),
  },
  {
    key: 'amount',
    title: 'Сумма',
    num: true,
    render: (l) => {
      const out = l.direction === 'OUT' || OUT_TYPES.has(l.entry_type)
      return <b className={out ? 'neg' : 'pos'}>{`${out ? '−' : '+'}${rub(l.amount)}`}</b>
    },
  },
]

const invoiceCols: Column<AdminInvoiceRow>[] = [
  { key: 'id', title: 'Счёт', render: (i) => <span className="mono">#{i.id}</span> },
  { key: 'created', title: 'Создан', render: (i) => dateTime(i.created_at) },
  { key: 'provider', title: 'Способ', render: (i) => PROVIDER_LABEL[i.provider] },
  { key: 'status', title: 'Статус', render: (i) => <InvoiceBadge status={i.status} created={i.created_at} /> },
  { key: 'amount', title: 'Сумма', num: true, render: (i) => rub(i.amount) },
]

type Tab = 'referrals' | 'ledger' | 'invoices'
const PAGE_SIZE = 10

function ReferralsTable({ id }: { id: number }) {
  const [p, setP] = useState<{ page: number; sort: string; order: SortOrder }>({ page: 1, sort: 'invited_at', order: 'desc' })
  const { data, error, refetch } = useReferrals(id, { ...p, page_size: PAGE_SIZE })
  if (error && !data) return <ErrorView error={error} onRetry={refetch} />
  return (
    <>
      <DataTable
        columns={referralCols}
        rows={data?.items}
        rowKey={(r) => r.id}
        loading={!data}
        skeletonRows={5}
        sort={p.sort}
        order={p.order}
        onSort={(sort, order) => setP({ page: 1, sort, order })}
        empty="Пользователь пока никого не пригласил"
      />
      {!!data?.total && <Pagination page={p.page} pageSize={PAGE_SIZE} total={data.total} onPage={(page) => setP({ ...p, page })} />}
    </>
  )
}

function LedgerTable({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const { data, error, refetch } = useLedger(id, { page, page_size: PAGE_SIZE })
  if (error && !data) return <ErrorView error={error} onRetry={refetch} />
  return (
    <>
      <DataTable columns={ledgerCols} rows={data?.items} rowKey={(l) => l.id} loading={!data} skeletonRows={5} empty="Операций по балансу нет" />
      {!!data?.total && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
    </>
  )
}

function InvoicesTable({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const { data, error, refetch } = useInvoices({ user_id: id, page, page_size: PAGE_SIZE, sort: 'created_at', order: 'desc' })
  if (error && !data) return <ErrorView error={error} onRetry={refetch} />
  return (
    <>
      <DataTable columns={invoiceCols} rows={data?.items} rowKey={(i) => i.id} loading={!data} skeletonRows={5} empty="Счетов нет" />
      {!!data?.total && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
      {!!data?.total && (
        // там фильтры по статусу и способу, сортировка — без ручного ввода ID в поиск
        <div className="pagination">
          <Link className="link link-more" to={`/invoices?user_id=${id}`}>
            Все счета пользователя в разделе «Счета» <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      )}
    </>
  )
}

/* ---------- Изменение баланса ---------- */

function BalanceModal({ user, direction, onClose }: { user: AdminUserDetails; direction: LedgerDirection | null; onClose(): void }) {
  const amount = useMoneyInput()
  const [comment, setComment] = useState('')
  const [touched, setTouched] = useState(false)
  const adjust = useAdjustBalance(user.id)
  const toast = useToast()
  const add = direction === 'IN'

  const close = () => {
    amount.reset()
    setComment('')
    setTouched(false)
    adjust.reset()
    onClose()
  }

  const v = amount.value
  const error = !touched
    ? null
    : !(v > 0)
      ? 'Введите сумму больше нуля'
      : v > MAX_ADJUST
        ? `Не больше ${rub(MAX_ADJUST)} за одну операцию`
        : !add && v > user.balance
          ? `На балансе только ${rub(user.balance)}`
          : null
  const after = v > 0 ? user.balance + (add ? v : -v) : null

  const submit = () => {
    setTouched(true)
    if (!(v > 0) || v > MAX_ADJUST || (!add && v > user.balance)) return
    adjust.mutate(
      { direction: add ? 'IN' : 'OUT', amount: v, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast(add ? `Начислено ${rub(v)}` : `Списано ${rub(v)}`)
          close()
        },
      },
    )
  }

  return (
    <Modal
      open={direction !== null}
      onClose={close}
      title={add ? 'Начислить на баланс' : 'Списать с баланса'}
      description={`Пользователь #${user.id} · сейчас на балансе ${rub(user.balance)}`}
      actions={
        <>
          <Button onClick={close}>Отмена</Button>
          <Button variant={add ? 'success' : 'danger'} loading={adjust.isPending} onClick={submit}>
            {add ? 'Начислить' : 'Списать'}
          </Button>
        </>
      }
    >
      <form
        className="modal-body"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Сумма" error={error ?? (adjust.error as Error | null)?.message} hint={after !== null ? `Баланс станет: ${rub(Math.round(after * 100) / 100)}` : 'В рублях, до двух знаков после запятой'}>
          {(fid) => (
            <div className="input-wrap">
              <input
                id={fid}
                className={`input has-suffix ${error ? 'has-error' : ''}`}
                style={{ paddingLeft: 12 }}
                inputMode="decimal"
                autoComplete="off"
                value={amount.raw}
                placeholder="0"
                onChange={(e) => amount.set(e.target.value)}
                onBlur={() => amount.raw && setTouched(true)}
              />
              <span className="input-suffix">₽</span>
            </div>
          )}
        </Field>
        <Field label="Комментарий" hint="Необязательно. Сохранится в журнале действий администраторов">
          {(fid) => (
            <textarea
              id={fid}
              className="textarea"
              maxLength={500}
              value={comment}
              placeholder={add ? 'Например: компенсация за сбой 12.10' : 'Например: возврат ошибочного начисления'}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
        </Field>
        {/* Enter в поле суммы отправляет форму */}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

/* ---------- Страница ---------- */

export function UserPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const location = useLocation()
  const [sp, setSp] = useSearchParams()
  const { canEdit } = useAuth()
  const { data: u, error, refetch } = useUser(id)
  const [modal, setModal] = useState<LedgerDirection | null>(null)
  const tab = (['referrals', 'ledger', 'invoices'].includes(sp.get('tab') ?? '') ? sp.get('tab') : 'referrals') as Tab

  // «Назад» — туда, откуда пришли (список, рефералы другого пользователя…). Если карточку открыли
  // из меню или по прямой ссылке — к списку с теми же фильтрами, иначе шаг назад увёл бы в «Счета»
  const fromNav = (location.state as { fromNav?: boolean } | null)?.fromNav
  const back = () => (location.key !== 'default' && !fromNav ? navigate(-1) : navigate(sectionListPath('/users')))

  if (!Number.isInteger(id) || id <= 0) return <ErrorView error={{ status: 404 }} />
  if (error && !u) return <ErrorView error={error} onRetry={refetch} />

  const rs = u?.referral_stats
  const sub = u?.subscription

  return (
    <>
      <button type="button" className="back-link" onClick={back}>
        <Icon name="chevronLeft" size={16} />
        Пользователи
      </button>

      <div className="page-head">
        <div className="user-title">
          <h1>Пользователь #{id}</h1>
          {u && <UserFlags user={u} trial={false} />}
        </div>
        {canEdit && u && (
          <div className="page-head-actions">
            <Button variant="success" icon="plus" onClick={() => setModal('IN')}>
              Начислить
            </Button>
            <Button icon="minus" onClick={() => setModal('OUT')} disabled={u.balance <= 0} title={u.balance <= 0 ? 'Баланс пуст' : undefined}>
              Списать
            </Button>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="grid-2">
          <Card title="Профиль">
            {u ? (
              <dl className="dl">
                <dt>ID в базе</dt>
                <dd>
                  <span className="mono">{u.id}</span>
                  <CopyButton value={u.id} label="ID" />
                </dd>
                <dt>Telegram ID</dt>
                <dd>
                  <span className="mono">{u.tg_user_id}</span>
                  <CopyButton value={u.tg_user_id} label="Telegram ID" />
                  <a className="link" href={`tg://user?id=${u.tg_user_id}`}>
                    Открыть в Telegram
                  </a>
                </dd>
                <dt>Регистрация</dt>
                <dd>
                  {dateTime(u.registered_at)} <span className="muted">· {relative(u.registered_at)}</span>
                </dd>
                <dt>Роль</dt>
                <dd>{ROLE_LABEL[u.role]}</dd>
                <dt>Язык</dt>
                <dd>{u.language_code ? <span className="mono">{u.language_code}</span> : <span className="muted">не указан</span>}</dd>
                <dt>День рождения</dt>
                <dd>{u.birthday_day && u.birthday_month ? `${u.birthday_day} ${MONTHS[u.birthday_month - 1]}` : <span className="muted">не указан</span>}</dd>
                <dt>Пробная подписка</dt>
                <dd>{u.has_used_trial_subscription ? <Badge tone="success">Использована</Badge> : <span className="muted">Не использована</span>}</dd>
                <dt>Бот</dt>
                <dd>{u.is_blocked_bot ? <Badge tone="warn">Заблокировал бота</Badge> : <Badge tone="success">Активен</Badge>}</dd>
                <dt>Аккаунт</dt>
                <dd>
                  {u.is_bot ? <Badge tone="danger">Бот</Badge> : 'Человек'}
                  {u.is_premium && <Badge tone="accent">Telegram Premium</Badge>}
                </dd>
                <dt>Пригласил</dt>
                <dd>
                  {u.referrer ? (
                    <Link className="link" to={`/users/${u.referrer.id}`}>
                      #{u.referrer.id} · {u.referrer.tg_user_id}
                    </Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </dd>
                <dt>Реферальная ссылка</dt>
                <dd>
                  {u.ref_link ? (
                    <>
                      <span className="mono">{u.ref_link.code}</span>
                      {u.ref_link.description && <span className="muted">· {u.ref_link.description}</span>}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </dd>
              </dl>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {Array.from({ length: 9 }, (_, i) => (
                  <Skeleton key={i} width={`${55 + ((i * 17) % 40)}%`} />
                ))}
              </div>
            )}
          </Card>

          <div className="stack">
            <Card title="Баланс">
              {u ? (
                <div className="stack" style={{ gap: 16 }}>
                  <div className="balance-big">{rub(u.balance)}</div>
                  <div className="metric-row">
                    <div className="metric">
                      <span>Пополнил</span>
                      <b>{rub(u.finance.deposits_total)}</b>
                      <div className="muted">{num(u.finance.deposits_count)} счетов</div>
                    </div>
                    <div className="metric">
                      <span>Потратил</span>
                      <b>{rub(u.finance.purchases_total)}</b>
                      <div className="muted">{num(u.finance.purchases_count)} покупок</div>
                    </div>
                    <div className="metric">
                      <span>Бонусы за рефералов</span>
                      <b>{rub(u.referral_stats.earnings_total)}</b>
                    </div>
                  </div>
                  {u.discount && (
                    <div className="notice is-accent">
                      <Icon name="check" />
                      <div>
                        Персональная скидка {Math.round(u.discount.discount * 100)}% до {date(u.discount.expire_at)}
                        {u.discount.text && <div className="muted">{u.discount.text}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Skeleton height={120} />
              )}
            </Card>

            <Card title="Подписка" right={u && <SubBadge status={u.subscription_status} expires={u.subscription_expires_at} />}>
              {!u ? (
                <Skeleton height={120} />
              ) : !sub ? (
                <p className="muted">Подписку не покупал</p>
              ) : (
                <div className="stack" style={{ gap: 16 }}>
                  <dl className="dl">
                    <dt>Куплена</dt>
                    <dd>{dateTime(sub.purchased_at)}</dd>
                    <dt>{sub.status === 'ACTIVE' ? 'Действует до' : 'Закончилась'}</dt>
                    <dd>
                      {dateTime(sub.expires_at)} <span className="muted">· {relative(sub.expires_at)}</span>
                    </dd>
                    <dt>Автопродление</dt>
                    <dd>{sub.auto_renewal.is_enabled ? `Включено, на ${sub.auto_renewal.days} дн.` : <span className="muted">Выключено</span>}</dd>
                    {sub.url && (
                      <>
                        <dt>Ссылка подписки</dt>
                        <dd>
                          <span className="mono" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sub.url}
                          </span>
                          <CopyButton value={sub.url} label="Ссылка" />
                        </dd>
                      </>
                    )}
                    {sub.remnawave_short_uuid && (
                      <>
                        <dt>Remnawave</dt>
                        <dd>
                          <span className="mono">{sub.remnawave_short_uuid}</span>
                          <CopyButton value={sub.remnawave_short_uuid} label="UUID" />
                        </dd>
                      </>
                    )}
                  </dl>
                  <div>
                    <div className="field-label" style={{ marginBottom: 8 }}>
                      Устройства · {sub.slots.filter((s) => s.is_occupied).length} из {sub.slots.length}
                    </div>
                    <div className="slots">
                      {sub.slots.map((s, i) => (
                        <div className="slot" key={s.id}>
                          <Icon name="monitor" />
                          <div className="slot-main">
                            <b>{s.is_occupied ? `${s.platform ?? 'Устройство'} · ${s.model ?? ''}` : `Слот ${i + 1}`}</b>
                            <span>
                              {s.is_occupied
                                ? `${s.agent ?? ''} · ${s.platform ?? ''} ${s.version_os ?? ''} · с ${s.first_connection_at ? date(s.first_connection_at) : '—'}`
                                : 'Свободен'}
                            </span>
                          </div>
                          <Badge tone={s.is_occupied ? 'success' : 'neutral'}>{s.is_occupied ? 'Подключено' : 'Свободно'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        <Card title="Рефералы" sub="Пользователи, пришедшие по приглашению">
          {rs ? (
            <div className="metric-row">
              <div className="metric">
                <span>Пригласил</span>
                <b>{num(rs.count)}</b>
              </div>
              <div className="metric">
                <span>Сумма пополнений</span>
                <b>{rub(rs.deposits_total)}</b>
              </div>
              <div className="metric">
                <span>Пополняли баланс</span>
                <b>{num(rs.depositors_count)}</b>
                <div className="muted">{percent(rs.depositors_count, rs.count)}</div>
              </div>
              <div className="metric">
                <span>Активировали пробный</span>
                <b>{num(rs.trial_count)}</b>
                <div className="muted">{percent(rs.trial_count, rs.count)}</div>
              </div>
              <div className="metric">
                <span>С активной подпиской</span>
                <b>{num(rs.active_count)}</b>
                <div className="muted">{percent(rs.active_count, rs.count)}</div>
              </div>
              <div className="metric">
                <span>Заработал бонусов</span>
                <b>{rub(rs.earnings_total)}</b>
              </div>
            </div>
          ) : (
            <Skeleton height={64} />
          )}
        </Card>

        <Card flush>
          <div className="toolbar">
            <Segmented<Tab>
              options={[
                { value: 'referrals', label: `Рефералы${rs ? ` · ${num(rs.count)}` : ''}` },
                { value: 'ledger', label: 'Операции' },
                { value: 'invoices', label: 'Счета' },
              ]}
              value={tab}
              onChange={(t) =>
                setSp(
                  (prev) => {
                    const n = new URLSearchParams(prev)
                    n.set('tab', t)
                    return n
                  },
                  { replace: true },
                )
              }
              label="История пользователя"
            />
          </div>
          {tab === 'referrals' && <ReferralsTable id={id} />}
          {tab === 'ledger' && <LedgerTable id={id} />}
          {tab === 'invoices' && <InvoicesTable id={id} />}
        </Card>
      </div>

      {u && canEdit && <BalanceModal user={u} direction={modal} onClose={() => setModal(null)} />}
    </>
  )
}
