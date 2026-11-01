/* Тексты и константы интерфейса. Данные пользователя приходят из API (src/api). */
import type { PaymentProvider } from '@vpnhub/shared'
import { E } from './emoji'

/** Максимум устройств при оформлении подписки */
export const MAX_DEVICES = 5

export const NO_SUB_TITLES = [
  'Интернет без границ',
  'Быстрый и надёжный VPN',
  'Одна подписка на всё',
  'Подключение за минуту',
  'Ваши данные под защитой',
]

/** Оформление способов оплаты: эмодзи и подпись по коду провайдера */
export const PROVIDER_LOOK: Record<PaymentProvider, { emoji: string; subtitle: string }> = {
  yookassa: { emoji: E.cardTile, subtitle: 'Visa, Mastercard, МИР' },
  WATA: { emoji: E.dollarTile, subtitle: 'Без комиссии, моментально' },
  rollypay: { emoji: E.dollarTile, subtitle: 'Карты и СБП' },
  tg_stars: { emoji: E.sparkles, subtitle: 'Оплата звёздами в Telegram' },
  cryptobot: { emoji: E.diamond, subtitle: 'USDT, TON, BTC' },
  heleket: { emoji: E.diamond, subtitle: 'Криптовалюта' },
  lolz: { emoji: E.money, subtitle: 'Баланс LOLZ' },
}

export const TOPUP_PRESETS = [100, 300, 500, 1000]
