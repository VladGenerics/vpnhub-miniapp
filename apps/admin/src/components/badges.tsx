import {
  INVOICE_STATUS_LABEL,
  ROLE_LABEL,
  type AdminUserRow,
  type InvoiceStatus,
  type SubscriptionStatus,
  type UserRole,
} from '@vpnhub/shared'
import { dateNum } from '../lib/format'
import { Badge, type Tone } from './ui'

/* Метки статусов — одинаковые во всех таблицах и карточках. */

export function SubBadge({ status, expires }: { status: SubscriptionStatus; expires?: string | null }) {
  if (status === 'ACTIVE') return <Badge tone="success" dot>{expires ? `до ${dateNum(expires)}` : 'Активна'}</Badge>
  if (status === 'DISABLED') return <Badge dot>{expires ? `истекла ${dateNum(expires)}` : 'Отключена'}</Badge>
  return <span className="muted">—</span>
}

const INVOICE_TONE: Record<InvoiceStatus, Tone> = { PAID: 'success', UNPAID: 'warn', EXPIRED: 'neutral', FAILED: 'danger' }

export const InvoiceBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={INVOICE_TONE[status]} dot>
    {INVOICE_STATUS_LABEL[status]}
  </Badge>
)

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'USER') return null
  return <Badge tone="accent">{ROLE_LABEL[role]}</Badge>
}

/** Признаки пользователя: бот, заблокировал бота, Premium, пробный период */
export function UserFlags({ user, trial = true }: { user: Pick<AdminUserRow, 'is_bot' | 'is_blocked_bot' | 'is_premium' | 'has_used_trial_subscription' | 'role'>; trial?: boolean }) {
  const any = user.is_bot || user.is_blocked_bot || user.is_premium || (trial && user.has_used_trial_subscription) || user.role !== 'USER'
  if (!any) return <span className="muted">—</span>
  return (
    <span className="badges">
      <RoleBadge role={user.role} />
      {user.is_bot && <Badge tone="danger">Бот</Badge>}
      {user.is_blocked_bot && <Badge tone="warn">Заблокировал</Badge>}
      {user.is_premium && <Badge tone="accent">Premium</Badge>}
      {trial && user.has_used_trial_subscription && <Badge>Пробный</Badge>}
    </span>
  )
}
