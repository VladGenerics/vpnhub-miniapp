import type { InvoiceStatus, LedgerEntryType, PaymentProvider, PurchaseKind, SubscriptionStatus, UserRole } from './types'

/* Подписи перечислений для интерфейса (по note из database.dbml). */

export const ROLE_LABEL: Record<UserRole, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  OWNER: 'Владелец',
  SUPPORT_AGENT: 'Поддержка',
}

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Активна',
  DISABLED: 'Отключена',
  NOT_FOUND: 'Нет подписки',
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: 'Не оплачен',
  PAID: 'Оплачен',
  EXPIRED: 'Истёк',
  FAILED: 'Ошибка',
}

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  yookassa: 'ЮKassa',
  tg_stars: 'Telegram Stars',
  cryptobot: 'CryptoBot',
  lolz: 'LOLZ',
  heleket: 'Heleket',
  WATA: 'Wata',
  rollypay: 'RollyPay',
}

export const PURCHASE_KIND_LABEL: Record<PurchaseKind, string> = {
  VPN_FIRST_PURCHASE: 'Первая покупка',
  VPN_RENEWAL: 'Возобновление',
  VPN_EXTENSION: 'Продление',
  VPN_AUTORENEWAL: 'Автопродление',
  DEVICE_SLOTS: 'Слоты устройств',
  VPN_PURCHASE: 'Обычная покупка',
}

export const LEDGER_TYPE_LABEL: Record<LedgerEntryType, string> = {
  DEPOSIT: 'Пополнение баланса',
  PURCHASE_VPN: 'Покупка VPN',
  PURCHASE_ADDITIONAL_DEVICE_SLOTS: 'Покупка слотов',
  REFUND: 'Возврат средств',
  ADMIN_ADD: 'Начисление администратором',
  ADMIN_DEDUCT: 'Списание администратором',
  INIT_BALANCE: 'Начальный баланс',
  BONUS_FROM_INVITE: 'Бонус за приглашение',
  BONUS_FROM_REFERRAL_FILL_BALANCE: 'Бонус с пополнения реферала',
}
