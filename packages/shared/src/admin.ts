import type {
  DeviceSlot,
  AutoRenewal,
  Invoice,
  InvoiceStatus,
  ISODate,
  LedgerDirection,
  LedgerEntryType,
  PaymentProvider,
  PersonalDiscount,
  PurchaseKind,
  SubscriptionStatus,
  UserRole,
} from './types'

/*
 * Контракт API админ-панели (префикс /admin). Поля — как в database.dbml,
 * вычисляемые поля (суммы, количества) помечены комментариями.
 */

export type SourceType = 'INVOICE' | 'PURCHASE' | 'PURCHASE_VPN'

/* ---------- Списки ---------- */

export type SortOrder = 'asc' | 'desc'

/** Общие параметры списков: страница с 1, сортировка и поиск */
export interface ListParams {
  page: number
  page_size: number
  sort?: string
  order?: SortOrder
  /** Поиск по полям — какие поля, указано у конкретного списка */
  q?: string
}

/** Ответ со страницей списка */
export interface Paginated<T> {
  items: T[]
  /** Сколько всего записей под фильтром */
  total: number
  page: number
  page_size: number
}

/* ---------- Админ ---------- */

/** GET /admin/me — кто вошёл. Доступ есть у OWNER, ADMIN и SUPPORT_AGENT (только чтение). */
export interface AdminMe {
  id: number
  tg_user_id: number
  role: UserRole
}

/* ---------- Пользователи ---------- */

export type UserFlag = 'bot' | 'blocked' | 'premium' | 'trial' | 'active_sub'

/**
 * GET /admin/users — строка списка.
 * Поиск q: по id, tg_user_id (точное совпадение числа) и language_code.
 * Сортировка: id, tg_user_id, registered_at, balance, subscription_expires_at, referrals_count.
 */
export interface AdminUserRow {
  id: number
  tg_user_id: number
  registered_at: ISODate
  language_code: string | null
  has_used_trial_subscription: boolean
  is_bot: boolean
  is_blocked_bot: boolean
  is_premium: boolean
  role: UserRole
  /** wallets.balance */
  balance: number
  /** Статус последней подписки; NOT_FOUND — подписки нет */
  subscription_status: SubscriptionStatus
  subscription_expires_at: ISODate | null
  /** Количество приглашённых (referrals) */
  referrals_count: number
}

export interface UsersParams extends ListParams {
  role?: UserRole
  flag?: UserFlag
}

/** Метрики рефералов пользователя (вычисляются бэкендом) */
export interface ReferralStats {
  /** Сколько пригласил */
  count: number
  /** Сумма оплаченных счетов всех рефералов */
  deposits_total: number
  /** Сколько рефералов хоть раз пополняли баланс */
  depositors_count: number
  /** Сколько активировали пробную подписку */
  trial_count: number
  /** Сколько с активной подпиской сейчас */
  active_count: number
  /** Сколько бонусов получил пользователь (referrer_earnings) */
  earnings_total: number
}

/** GET /admin/users/:id */
export interface AdminUserDetails extends AdminUserRow {
  birthday_day: number | null
  birthday_month: number | null
  subscription: {
    id: number
    status: SubscriptionStatus
    purchased_at: ISODate
    expires_at: ISODate
    url: string | null
    remnawave_short_uuid: string | null
    auto_renewal: AutoRenewal
    slots: DeviceSlot[]
  } | null
  /** user_current_discounts */
  discount: PersonalDiscount | null
  /** Кто пригласил (referrals.referrer_id) */
  referrer: { id: number; tg_user_id: number } | null
  /** По какой реферальной ссылке пришёл (ref_link_usages + ref_links) */
  ref_link: { code: string; description: string | null; joined_at: ISODate } | null
  referral_stats: ReferralStats
  finance: {
    /** Сумма и количество оплаченных счетов */
    deposits_total: number
    deposits_count: number
    /** Сумма и количество покупок */
    purchases_total: number
    purchases_count: number
  }
}

/** GET /admin/users/:id/referrals — приглашённые пользователем */
export interface ReferralRow {
  id: number
  tg_user_id: number
  /** referrals.created_at */
  invited_at: ISODate
  has_used_trial_subscription: boolean
  is_blocked_bot: boolean
  subscription_status: SubscriptionStatus
  /** Сумма оплаченных счетов реферала */
  deposits_total: number
}

/** GET /admin/users/:id/ledger — операции по кошельку пользователя (ledger_entries) */
export interface LedgerEntry {
  id: number
  entry_type: LedgerEntryType
  direction: LedgerDirection
  amount: number
  source_type: SourceType | null
  source_id: number | null
  created_at: ISODate
}

/**
 * POST /admin/users/:id/balance — начисление (IN → ADMIN_ADD) или списание (OUT → ADMIN_DEDUCT).
 * Комментарий бэкенд пишет в audit_logs.comment. Ответ — обновлённый AdminUserDetails.
 */
export interface BalanceAdjustRequest {
  direction: LedgerDirection
  amount: number
  comment?: string
}

/* ---------- Счета ---------- */

/**
 * GET /admin/invoices — счета.
 * Поиск q: по id счёта, user_id, tg_user_id и external_invoice_id.
 * Сортировка: id, amount, created_at, paid_at.
 */
export interface AdminInvoiceRow extends Invoice {
  /** users.tg_user_id владельца счёта */
  user_tg_id: number
}

export interface InvoicesParams extends ListParams {
  status?: InvoiceStatus
  provider?: PaymentProvider
  user_id?: number
}

/* ---------- Платёжные системы и настройки ---------- */

/** PATCH /admin/payment-methods/:id */
export interface PaymentMethodPatch {
  name?: string
  is_active?: boolean
  min_amount?: number
}

/** GET /admin/settings — часть application_settings, которую меняет админка */
export interface AdminSettings {
  support_link: string
  /** Бонус приглашённому пользователю, ₽ */
  invited_bonus: number
  /** Бонус пригласившему, ₽ */
  referral_bonus: number
  updated_at: ISODate | null
}

/** PATCH /admin/settings */
export type AdminSettingsPatch = Partial<Pick<AdminSettings, 'support_link' | 'invited_bonus' | 'referral_bonus'>>

/* ---------- Dashboard ---------- */

/** GET /admin/dashboard — сводка; «сегодня» и «30 дней» считаются в часовом поясе tz */
export interface Dashboard {
  users_total: number
  users_today: number
  /** Люди (не боты), заблокировавшие бота */
  users_blocked: number
  users_bots: number
  subscriptions_active: number
  deposits_total: number
  deposits_today: number
  deposits_30d: number
  purchases_30d_count: number
  purchases_30d_amount: number
  invoices_unpaid: number
  /** Последние 30 дней по дням */
  daily: { t: ISODate; new_users: number; deposits: number }[]
  latest_users: AdminUserRow[]
  latest_invoices: AdminInvoiceRow[]
}

/* ---------- Статистика ---------- */

export type Granularity = 'hour' | 'day' | 'month' | 'year'

/**
 * Параметры запросов статистики. Интервалы считаются в часовом поясе tz (IANA),
 * t в ответе — начало интервала.
 */
export interface StatsQuery {
  from: ISODate
  to: ISODate
  granularity: Granularity
  tz: string
}

/** GET /admin/stats/range — за какой период есть данные (от первой регистрации до сейчас) */
export interface StatsRange {
  from: ISODate
  to: ISODate
}

/**
 * GET /admin/stats/users. Даты блокировки бота и пометки «бот» в базе нет, поэтому по
 * времени считаются только регистрации, а доли категорий — по текущим флагам.
 * Категории не пересекаются: боты — все is_bot; «заблокировали» — люди (не боты)
 * с is_blocked_bot; активные = всего − заблокировали − боты.
 */
export interface UsersStatsPoint {
  t: ISODate
  /** Всего пользователей на конец интервала */
  total: number
  /** Новых за интервал */
  new_total: number
  /** Из новых — люди, которые сейчас заблокировали бота */
  new_blocked: number
  /** Из новых — те, кто сейчас помечен ботом */
  new_bots: number
}

/** Аудитория на момент запроса */
export interface UsersNow {
  total: number
  blocked: number
  bots: number
}

export interface UsersStats {
  now: UsersNow
  points: UsersStatsPoint[]
}

/** GET /admin/stats/deposits — оплаченные счета (по paid_at) */
export interface DepositsStatsPoint {
  t: ISODate
  amount: number
  count: number
  /** То же по способам оплаты */
  by_provider: Partial<Record<PaymentProvider, { amount: number; count: number }>>
}

export interface DepositsStats {
  /** Сумма всех пополнений до начала периода — база для накопительного графика */
  total_before: number
  points: DepositsStatsPoint[]
}

/** GET /admin/stats/purchases — покупки (по created_at) */
export interface PurchasesStatsPoint {
  t: ISODate
  by_kind: Partial<Record<PurchaseKind, { count: number; amount: number }>>
  /** Сколько слотов устройств куплено (purchase_slots) */
  slots: number
}
