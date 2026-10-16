/* Демо-данные. Позже заменяются ответами бэкенда. */
import { E } from './emoji'

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux'

export interface Device {
  id: string
  platform: Platform
  model: string
  osVersion: string
  userAgent: string
  lastSeen: string
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  macos: 'macOS',
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  linux: 'Linux',
}

export const deviceName = (d: Device) => `${PLATFORM_LABEL[d.platform]} | ${d.model}`

export const DEVICES: Device[] = [
  {
    id: 'd1',
    platform: 'macos',
    model: 'MacBook',
    osVersion: '26.7',
    userAgent: 'Happ/5.3.0/macos catalyst/2607271142538',
    lastSeen: 'в сети',
  },
  {
    id: 'd2',
    platform: 'ios',
    model: 'iPhone 17 Pro',
    osVersion: '26.6',
    userAgent: 'Happ/5.3.0/ios/2607271142538',
    lastSeen: '12 минут назад',
  },
  {
    id: 'd3',
    platform: 'android',
    model: 'Pixel 10',
    osVersion: '17',
    userAgent: 'v2rayNG/1.10.8 (Android 17; Pixel 10)',
    lastSeen: '2 часа назад',
  },
  {
    id: 'd4',
    platform: 'windows',
    model: 'Desktop PC',
    osVersion: '11 24H2',
    userAgent: 'Hiddify/2.5.7 (Windows NT 10.0; Win64; x64)',
    lastSeen: 'вчера',
  },
  {
    id: 'd5',
    platform: 'linux',
    model: 'ThinkPad X1',
    osVersion: 'Ubuntu 26.04',
    userAgent: 'Clash.Meta/1.19.4 (linux; amd64)',
    lastSeen: '3 дня назад',
  },
]

export const PLAN = {
  /** ₽ за одно устройство в сутки */
  pricePerDeviceDay: 5,
  maxSlots: 5,
  subscriptionUrl: 'https://sub.vpnhub.app/s/8Kf2xQ9mZt4pLw7R',
  // относительно «сегодня», чтобы демо всегда выглядело актуально
  startedAt: new Date(Date.now() - 14 * 864e5),
  expiresAt: new Date(Date.now() + 16 * 864e5),
}

export const USER = {
  localId: 104857,
  balance: 450,
  fallbackName: 'Гость',
}

export const NO_SUB_TITLES = [
  'Интернет без границ',
  'Быстрый и надёжный VPN',
  'Одна подписка на всё',
  'Подключение за минуту',
  'Ваши данные под защитой',
]

export interface Provider {
  id: string
  title: string
  subtitle: string
  emoji: string
}

export const PROVIDERS: Provider[] = [
  { id: 'card', title: 'Банковская карта', subtitle: 'Visa, Mastercard, МИР', emoji: E.cardTile },
  { id: 'sbp', title: 'СБП', subtitle: 'Без комиссии, моментально', emoji: E.dollarTile },
  { id: 'stars', title: 'Telegram Stars', subtitle: 'Оплата звёздами в Telegram', emoji: E.sparkles },
  { id: 'crypto', title: 'Криптовалюта', subtitle: 'USDT, TON, BTC', emoji: E.diamond },
]

export const TOPUP_PRESETS = [100, 300, 500, 1000]
