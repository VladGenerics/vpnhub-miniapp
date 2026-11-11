import { useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LuChevronLeft } from 'react-icons/lu'
import { isTelegram, useTelegramBackButton, useTelegramReturnButton } from '../lib/telegram'
import { useIsWide } from '../hooks/useMediaQuery'
import { AppEmoji } from './AppEmoji'
import { SIDEBAR_PAGES } from './Sidebar'
import { NAV_ROUTES } from './nav'

// Назад по истории приложения. Если страницу открыли напрямую (ссылкой, после входа), идём на fallback
// (по умолчанию главная), а не уходим с сайта. history.length не подходит, он считает и чужие страницы вкладки.
export function useGoBack(fallback: string = '/', fallbackState?: unknown) {
  const navigate = useNavigate()
  return useCallback(
    () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(fallback, { replace: true, state: fallbackState })),
    [navigate, fallback, fallbackState],
  )
}

// Обёртка страницы. Для вложенных (back) в Telegram показываем родную кнопку «Назад», в браузере - свою.
// При боковой панели «Информация», «Помощь» и «Оформление» - разделы меню, «Назад» там лишний.
// Отступ снизу под нижнюю панель - по адресу: «Пополнить» бывает и с «Назад», а панель там всё равно есть.
// wide - страница раскладывается на ПК в две колонки (см. Cols), шапка становится строкой.
// returnButton - «Назад» сверху и в Telegram, плюс родная нижняя кнопка окна мини-аппа «Вернуться»
// (только в Telegram и на телефонной ширине, на ПК-ширине её нет).
// backTo / backState - куда вернуться, если страницу открыли напрямую и истории нет
export function Page({
  back: nested,
  wide: twoCol,
  returnButton,
  backTo,
  backState,
  children,
  className,
}: {
  back?: boolean
  wide?: boolean
  returnButton?: boolean
  backTo?: string
  backState?: unknown
  children: ReactNode
  className?: string
}) {
  const goBack = useGoBack(backTo, backState)
  const wide = useIsWide()
  const { pathname, state } = useLocation()
  // пришли не из меню, а по ссылке со страницы (state.back) - «Назад» нужен и при боковой панели
  const fromPage = !!(state as { back?: boolean } | null)?.back
  const back = nested && !(wide && SIDEBAR_PAGES.includes(pathname) && !fromPage)
  useTelegramBackButton(back ? goBack : null)
  useTelegramReturnButton(back && returnButton && !wide ? goBack : null)

  return (
    <main className={`page ${NAV_ROUTES.includes(pathname) ? 'has-nav' : 'is-nested'} ${twoCol ? 'is-wide' : ''} ${className ?? ''}`}>
      {back && (!isTelegram || returnButton) && (
        <button className="web-back" onClick={goBack}>
          <LuChevronLeft size={20} />
          Назад
        </button>
      )}
      {children}
    </main>
  )
}

/**
 * Две колонки на ПК. На телефоне и в узком окне обёртки «прозрачные» (display: contents),
 * и блоки идут одним столбцом, как без них
 */
export function Cols({ left, right, equal }: { left: ReactNode; right: ReactNode; equal?: boolean }) {
  // equal - карточки обеих колонок одной высоты, строки делят её поровну (профиль: «Аккаунт» и «Приложение»)
  return (
    <div className={`cols ${equal ? 'is-equal' : ''}`}>
      <div className="col">{left}</div>
      <div className="col">{right}</div>
    </div>
  )
}

/** Шапка страницы: анимированный эмодзи или логотип VPNHub (emoji="logo") */
export function Hero({ emoji, title, subtitle, size = 120 }: { emoji: string | 'logo'; title: ReactNode; subtitle?: ReactNode; size?: number }) {
  return (
    <header className="hero">
      <div className="hero-emoji" style={{ width: size, height: size }}>
        {emoji === 'logo' ? (
          <img className="brand-logo hero-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width={size * 0.78} height={size * 0.78} alt="" />
        ) : (
          // имя эмодзи приложения, custom_emoji_id или обычный символ (эмодзи разделов задают в админке)
          <AppEmoji value={emoji} size={size} />
        )}
      </div>
      <h1 className="hero-title">{title}</h1>
      {subtitle && <p className="hero-subtitle">{subtitle}</p>}
    </header>
  )
}
