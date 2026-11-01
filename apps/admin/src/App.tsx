import { lazy, Suspense } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAdmin } from './auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { StateView } from './components/ui'
import { useApplyPalette } from './lib/palette'
import { useApplyTheme } from './lib/theme'
import { DashboardPage } from './pages/DashboardPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LoginPage, NoAccessPage } from './pages/LoginPage'
import { PaymentMethodsPage } from './pages/PaymentMethodsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserPage } from './pages/UserPage'
import { UsersPage } from './pages/UsersPage'

// статистика тянет ECharts (~400 КБ) — грузится, только когда открыли раздел
const StatisticsPage = lazy(() => import('./pages/statistics/StatisticsPage'))
const UsersStats = lazy(() => import('./pages/statistics/UsersStats'))
const DepositsStats = lazy(() => import('./pages/statistics/DepositsStats'))
const PurchasesStats = lazy(() => import('./pages/statistics/PurchasesStats'))

const Loading = () => (
  <div className="state" aria-busy>
    <span className="spinner" />
  </div>
)

function NotFound() {
  return (
    <StateView
      title="Страница не найдена"
      text="Адрес указан неверно или раздел переехал"
      action={
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      }
    />
  )
}

/** Сбрасывает «упавшую» страницу при переходе в другой раздел */
function Page() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1]
  return (
    <ErrorBoundary key={section}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payment-methods" element={<PaymentMethodsPage />} />
          <Route path="statistics" element={<StatisticsPage />}>
            <Route index element={<UsersStats />} />
            <Route path="deposits" element={<DepositsStats />} />
            <Route path="purchases" element={<PurchasesStats />} />
          </Route>
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  useApplyTheme()
  useApplyPalette()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAdmin denied={<NoAccessPage />}>
            <Layout />
          </RequireAdmin>
        }
      >
        <Route path="*" element={<Page />} />
      </Route>
    </Routes>
  )
}
