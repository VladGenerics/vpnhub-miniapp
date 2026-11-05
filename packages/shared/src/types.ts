// Типы данных между фронтендом и бэкендом. Поля называются как колонки в database.dbml (snake_case).
// Деньги - число в рублях, даты - строки ISO 8601.

export type ISODate = string

// --- перечисления ---

export type UserRole = 'USER' | 'ADMIN' | 'OWNER' | 'SUPPORT_AGENT'
export type SubscriptionStatus = 'ACTIVE' | 'DISABLED' | 'NOT_FOUND'
export type InvoiceStatus = 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED'
export type InvoiceCurrency = 'RUB' | 'USD' | 'EUR'
export type PaymentProvider = 'cryptobot' | 'yookassa' | 'tg_stars' | 'lolz' | 'heleket' | 'WATA' | 'rollypay'
export type PurchaseKind = 'VPN_FIRST_PURCHASE' | 'VPN_EXTENSION' | 'VPN_RENEWAL' | 'VPN_AUTORENEWAL' | 'DEVICE_SLOTS' | 'VPN_PURCHASE'
export type LedgerDirection = 'IN' | 'OUT'
export type LedgerEntryType =
  | 'DEPOSIT'
  | 'PURCHASE_VPN'
  | 'PURCHASE_ADDITIONAL_DEVICE_SLOTS'
  | 'REFUND'
  | 'ADMIN_ADD'
  | 'ADMIN_DEDUCT'
  | 'INIT_BALANCE'
  | 'BONUS_FROM_INVITE'
  | 'BONUS_FROM_REFERRAL_FILL_BALANCE'

// --- пользователь ---

/** Текущий пользователь (кабинет). users + баланс кошелька. */
export interface Me {
  id: number
  tg_user_id: number
  registered_at: ISODate
  language_code: string | null
  has_used_trial_subscription: boolean
  is_premium: boolean
  role: UserRole
  /** wallets.balance кошелька пользователя */
  balance: number
  /** Привязанная почта (PUT /me/email). В database.dbml такого поля пока нет */
  email?: string | null
}

// --- подписка ---

export interface AutoRenewal {
  is_enabled: boolean
  days: number
}

/** device_slots: слот устройства внутри подписки */
export interface DeviceSlot {
  id: number
  hwid: string | null
  agent: string | null
  model: string | null
  platform: string | null
  version_os: string | null
  is_occupied: boolean
  is_sellable: boolean
  first_connection_at: ISODate | null
  updated_at: ISODate
}

/** Подписка с настройками автопродления и слотами (без удалённых). */
export interface Subscription {
  id: number
  status: SubscriptionStatus
  purchased_at: ISODate
  expires_at: ISODate
  url: string | null
  auto_renewal: AutoRenewal
  slots: DeviceSlot[]
}

// --- тарифы ---

/** prices: цена дня за одно устройство, действует от min_days дней */
export interface Price {
  min_days: number
  price_per_day: number
}

/** device_count_discounts: скидка (доля 0..1) от device_count устройств */
export interface DeviceCountDiscount {
  device_count: number
  discount: number
}

/** user_current_discounts: персональная скидка (доля 0..1) */
export interface PersonalDiscount {
  discount: number
  text: string | null
  expire_at: ISODate
}

export interface Tariffs {
  prices: Price[]
  device_discounts: DeviceCountDiscount[]
  /** application_settings.current_discount - общая скидка (доля 0..1) */
  current_discount: number
  personal_discount: PersonalDiscount | null
}

// --- оплата ---

/** payment_methods */
export interface PaymentMethod {
  id: number
  name: string
  provider: PaymentProvider
  tg_emoji_id: number | null
  sequence_number: number
  min_amount: number
  is_active: boolean
}

/** invoices */
export interface Invoice {
  id: number
  user_id: number
  provider: PaymentProvider
  amount: number
  selected_currency: InvoiceCurrency
  status: InvoiceStatus
  created_at: ISODate
  updated_at: ISODate | null
  external_invoice_id: string | null
  pay_url: string | null
  paid_at: ISODate | null
}

// --- публичные настройки ---

export interface PublicSettings {
  support_link: string
  invited_bonus: number
  referral_bonus: number
}

// --- вход с сайта ---

/** Данные Telegram Login Widget - бэкенд проверяет hash токеном бота */
export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface TelegramLoginRequest extends TelegramAuthData {
  /** Код реферальной ссылки (ref_links.code) или ID пригласившего - при первом входе */
  ref?: string
}

export interface AuthResponse {
  token: string
}

// --- запросы ---

export interface CreateInvoiceRequest {
  provider: PaymentProvider
  amount: number
}

export interface PurchaseRequest {
  days: number
  devices: number
}
