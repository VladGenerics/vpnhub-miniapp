// Тексты и константы интерфейса. Данные пользователя приходят из API.
import type { PaymentProvider } from '@vpnhub/shared'
import { E } from './emoji'

/** Максимум устройств при оформлении подписки */
export const MAX_DEVICES = 1000

/** Максимум дней в подписке, продлении и автопродлении */
export const MAX_DAYS = 365

export const NO_SUB_TITLES = ['Интернет без границ', 'Быстрый и надёжный VPN', 'Одна подписка на всё', 'Подключение за минуту', 'Ваши данные под защитой']

/** Эмодзи и подпись для каждого способа оплаты */
export const PROVIDER_LOOK: Record<PaymentProvider, { emoji: string; subtitle: string }> = {
  yookassa: { emoji: E.payCard, subtitle: 'Visa, Mastercard, МИР' },
  WATA: { emoji: E.paySbp, subtitle: 'Без комиссии, моментально' },
  rollypay: { emoji: E.dollarTile, subtitle: 'Карты и СБП' },
  tg_stars: { emoji: E.tgStar, subtitle: 'Оплата звёздами в Telegram' },
  cryptobot: { emoji: E.payCrypto, subtitle: 'USDT, TON, BTC' },
  heleket: { emoji: E.payCrypto, subtitle: 'Криптовалюта' },
  lolz: { emoji: E.money, subtitle: 'Баланс LOLZ' },
}

export const TOPUP_PRESETS = [100, 300, 500, 1000]
