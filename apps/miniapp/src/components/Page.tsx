import { useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LuChevronLeft } from 'react-icons/lu'
import { isTelegram, useTelegramBackButton } from '../lib/telegram'
import { useIsWide } from '../hooks/useMediaQuery'
import { Lottie } from './Lottie'
import { SIDEBAR_PAGES } from './Sidebar'

// Назад по истории приложения. Если страницу открыли напрямую (ссылкой, после входа), идём на главную,
// а не уходим с сайта. history.length не подходит, он считает и чужие страницы вкладки.
export function useGoBack() {
  const navigate = useNavigate()
  return useCallback(() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/', { replace: true })), [navigate])
}

// Обёртка страницы. Для вложенных (back) в Telegram показываем родную кнопку «Назад», в браузере - свою.
// При боковой панели «Информация», «Помощь» и «Оформление» - разделы меню, «Назад» там лишний
export function Page({ back: nested, children, className }: { back?: boolean; children: ReactNode; className?: string }) {
  const goBack = useGoBack()
  const wide = useIsWide()
  const { pathname } = useLocation()
  const back = nested && !(wide && SIDEBAR_PAGES.includes(pathname))
  useTelegramBackButton(back ? goBack : null)

  return (
    <main className={`page ${back ? 'is-nested' : 'has-nav'} ${className ?? ''}`}>
      {back && !isTelegram && (
        <button className="web-back" onClick={goBack}>
          <LuChevronLeft size={20} />
          Назад
        </button>
      )}
      {children}
    </main>
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
          <Lottie name={emoji} size={size} />
        )}
      </div>
      <h1 className="hero-title">{title}</h1>
      {subtitle && <p className="hero-subtitle">{subtitle}</p>}
    </header>
  )
}
