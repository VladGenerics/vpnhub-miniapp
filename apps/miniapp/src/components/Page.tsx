import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTelegram, useTelegramBackButton } from '../lib/telegram'
import { Lottie } from './Lottie'

/**
 * Назад по истории приложения. Если страницу открыли напрямую (ссылкой, закладкой, после входа),
 * шагать назад некуда — тогда на главную, а не прочь с сайта. history.length для этого не годится:
 * он считает и чужие страницы вкладки. idx — номер записи, который ведёт React Router.
 */
export function useGoBack() {
  const navigate = useNavigate()
  return useCallback(() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/', { replace: true })), [navigate])
}

/**
 * Обёртка страницы. Для вложенных страниц (back) в Telegram показывается
 * нативная кнопка «Назад», в браузере — своя в шапке.
 */
export function Page({ back, children, className }: { back?: boolean; children: ReactNode; className?: string }) {
  const goBack = useGoBack()
  useTelegramBackButton(back ? goBack : null)

  return (
    <main className={`page ${back ? 'is-nested' : 'has-nav'} ${className ?? ''}`}>
      {back && !isTelegram && (
        <button className="web-back" onClick={goBack}>
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
            <path d="M8 2L2 8l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
