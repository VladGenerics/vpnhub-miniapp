import { INVOICE_STATUS_LABEL, ROLE_LABEL, type AdminUserRow, type InvoiceStatus, type SubscriptionStatus } from '@vpnhub/shared'
import { isStale, waited } from '../lib/invoices'
import { dateNum } from '../lib/format'
import { Badge, type Tone } from './ui'

export function SubBadge({ status, expires }: { status: SubscriptionStatus; expires?: string | null }) {
  if (status === 'ACTIVE')
    return (
      <Badge tone="success" dot>
        {expires ? `до ${dateNum(expires)}` : 'Активна'}
      </Badge>
    )
  if (status === 'DISABLED') return <Badge dot>{expires ? `истекла ${dateNum(expires)}` : 'Отключена'}</Badge>
  return <span className="muted">—</span>
}

const INVOICE_TONE: Record<InvoiceStatus, Tone> = { PAID: 'success', UNPAID: 'warn', EXPIRED: 'neutral', FAILED: 'danger' }

/** Неоплаченный дольше часа подсвечивается как зависший */
export function InvoiceBadge({ status, created }: { status: InvoiceStatus; created?: string }) {
  if (created && isStale({ status, created_at: created }))
    return (
      <span title="Ждёт оплаты дольше часа — стоит проверить платёжную систему">
        <Badge tone="warn" dot>
          {INVOICE_STATUS_LABEL[status]} · {waited(created)}
        </Badge>
      </span>
    )
  return (
    <Badge tone={INVOICE_TONE[status]} dot>
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  )
}

/** Признаки пользователя: роль, бот, заблокировал бота, Premium, пробный период.
 *  max — сколько значков показать, остальные уходят в «+N» с подсказкой (в таблицах, чтобы колонка не разъезжалась) */
export function UserFlags({
  user,
  trial = true,
  max,
}: {
  user: Pick<AdminUserRow, 'is_bot' | 'is_blocked_bot' | 'is_premium' | 'has_used_trial_subscription' | 'role'>
  trial?: boolean
  max?: number
}) {
  const flags: { label: string; tone?: Tone }[] = []
  if (user.role !== 'USER') flags.push({ label: ROLE_LABEL[user.role], tone: 'accent' })
  if (user.is_bot) flags.push({ label: 'Бот', tone: 'danger' })
  if (user.is_blocked_bot) flags.push({ label: 'Заблокировал', tone: 'warn' })
  if (user.is_premium) flags.push({ label: 'Premium', tone: 'accent' })
  if (trial && user.has_used_trial_subscription) flags.push({ label: 'Пробный' })
  if (!flags.length) return <span className="muted">—</span>
  const shown = max && flags.length > max ? flags.slice(0, max - 1) : flags
  const rest = flags.slice(shown.length)
  return (
    <span className="badges">
      {shown.map((f) => (
        <Badge key={f.label} tone={f.tone}>
          {f.label}
        </Badge>
      ))}
      {rest.length > 0 && (
        <span title={rest.map((f) => f.label).join(', ')}>
          <Badge>+{rest.length}</Badge>
        </span>
      )}
    </span>
  )
}
