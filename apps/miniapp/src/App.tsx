import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Sidebar } from './components/Sidebar'
import { NAV_ROUTES } from './components/nav'
import { SubscriptionPage } from './pages/subscription/SubscriptionPage'
import { DevicePage } from './pages/DevicePage'
import { TopUpPage } from './pages/TopUpPage'
import { ProfilePage } from './pages/ProfilePage'
import { ArticlesPage } from './pages/ArticlesPage'
import { ArticlePage } from './pages/ArticlePage'
import { LoginPage } from './pages/LoginPage'
import { RequireAuth } from './auth/AuthProvider'
import { USE_MOCKS } from './api'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTelegramChrome, getColorScheme, isTelegram, tg } from './lib/telegram'
import { preloadEmoji } from './components/Lottie'
import { E } from './data/emoji'
import { currentBg, emojiFolder, type PaletteId } from './lib/palette'
import { useApp, type ThemeMode } from './store/AppStore'
import { useIsWide } from './hooks/useMediaQuery'

// витрины /ui и /emoji служебные, грузим их отдельно
const UiKitPage = lazy(() => import('./pages/UiKitPage').then((m) => ({ default: m.UiKitPage })))
const TestPayPage = lazy(() => import('./pages/TestPayPage').then((m) => ({ default: m.TestPayPage })))
// галерея эмодзи только для разработки, в прод-сборку не попадает
const EmojiGalleryPage = import.meta.env.DEV ? lazy(() => import('./pages/EmojiGalleryPage').then((m) => ({ default: m.EmojiGalleryPage }))) : () => null

function syncChrome() {
  const bg = currentBg()
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg)
  applyTelegramChrome(bg)
}

function useTheme(palette: PaletteId, mode: ThemeMode) {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = mode === 'auto' ? getColorScheme() : mode
      syncChrome()
    }
    apply()
    if (mode !== 'auto') return
    if (isTelegram && tg) {
      tg.onEvent('themeChanged', apply)
      return () => tg?.offEvent('themeChanged', apply)
    }
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [palette, mode])
}

function useRouteAnimation(pathname: string) {
  const navType = useNavigationType()
  const prev = useRef(pathname)
  const anim = useMemo(() => {
    const from = prev.current
    if (from === pathname) return 'route-fade'
    if (NAV_ROUTES.includes(from) && NAV_ROUTES.includes(pathname)) {
      return NAV_ROUTES.indexOf(pathname) > NAV_ROUTES.indexOf(from) ? 'route-tab-right' : 'route-tab-left'
    }
    return navType === 'POP' ? 'route-back' : 'route-forward'
  }, [pathname])
  useEffect(() => {
    prev.current = pathname
  }, [pathname])
  return anim
}

export default function App() {
  const { pathname } = useLocation()
  const routeAnim = useRouteAnimation(pathname)
  const { palette, themeMode, sidebarCollapsed } = useApp()
  const wide = useIsWide()
  useTheme(palette, themeMode)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    preloadEmoji(emojiFolder(palette), E.renewTile, E.walletTile, E.dollarTile, E.link, E.mail, E.bulbTile, E.questionTile)
  }, [palette])

  // заглушка платёжки для счетов на тестовых данных, без входа
  if (USE_MOCKS && pathname === '/test-pay') {
    return (
      <div className="app in-browser">
        <Suspense fallback={null}>
          <TestPayPage />
        </Suspense>
      </div>
    )
  }

  if (pathname === '/login') {
    return (
      <div className={`app ${isTelegram ? 'in-telegram' : 'in-browser'}`}>
        <LoginPage />
      </div>
    )
  }

  return (
    <RequireAuth>
      <div
        className={`app ${isTelegram ? 'in-telegram' : 'in-browser'} ${wide ? 'has-sidebar' : ''} ${wide && sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}
      >
        {wide && <Sidebar />}
        <div className="app-main">
          <div className={`route ${routeAnim}`} key={pathname}>
            {/* у каждой страницы своя граница ошибок, при переходе она сбрасывается */}
            <ErrorBoundary>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<SubscriptionPage />} />
                  <Route path="/device/:id" element={<DevicePage />} />
                  <Route path="/topup" element={<TopUpPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/info" element={<ArticlesPage kind="info" />} />
                  <Route path="/info/:slug" element={<ArticlePage kind="info" />} />
                  <Route path="/help" element={<ArticlesPage kind="help" />} />
                  <Route path="/help/:slug" element={<ArticlePage kind="help" />} />
                  <Route path="/ui" element={<UiKitPage />} />
                  {import.meta.env.DEV && <Route path="/emoji" element={<EmojiGalleryPage />} />}
                  <Route path="*" element={<SubscriptionPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
        {!wide && NAV_ROUTES.includes(pathname) && <BottomNav />}
      </div>
    </RequireAuth>
  )
}
