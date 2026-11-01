import { preloadTelegramLogin as preload, telegramLoginPopup, type TelegramAuthData } from '@vpnhub/shared'

/*
 * Вход через Telegram на сайте. Нужны VITE_TG_BOT_ID (числовой id бота — первая
 * часть токена) и домен сайта, привязанный к боту в @BotFather командой /setdomain.
 */

export const BOT_ID = Number(import.meta.env.VITE_TG_BOT_ID) || null
export const BOT_USERNAME = (import.meta.env.VITE_TG_BOT_USERNAME as string | undefined) || null

/** Заранее подгрузить скрипт, чтобы окно открылось сразу по клику */
export const preloadTelegramLogin = () => {
  if (BOT_ID) preload()
}

/** Открывает окно входа Telegram. null — пользователь закрыл окно. */
export async function telegramLogin(): Promise<TelegramAuthData | null> {
  if (!BOT_ID) throw new Error('Не задан VITE_TG_BOT_ID')
  return telegramLoginPopup(BOT_ID)
}

/** Ссылка на бота — открыть кабинет внутри Telegram */
export const botLink = (startParam?: string) =>
  BOT_USERNAME ? `https://t.me/${BOT_USERNAME}${startParam ? `?start=${encodeURIComponent(startParam)}` : ''}` : null
