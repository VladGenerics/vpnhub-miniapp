import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './api/queries'
import { AuthProvider } from './auth/AuthProvider'
import { ToastProvider } from './components/Toast'
import './styles/admin.css'

// внутри Telegram панель разворачивается на весь экран
const tg = (window as unknown as { Telegram?: { WebApp?: { ready(): void; expand(): void; initData?: string } } }).Telegram?.WebApp
if (tg?.initData) {
  tg.ready()
  tg.expand()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* basename — если панель собрана под путём (VITE_BASE_PATH), например /admin */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
