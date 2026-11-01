import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Segmented } from '../../components/Segmented'
import { PageHead } from '../../components/ui'

type Tab = '' | 'deposits' | 'purchases'

/* Вкладки — отдельные подразделы со своими адресами: /statistics, /statistics/deposits, /statistics/purchases */
const TABS: { value: Tab; label: string }[] = [
  { value: '', label: 'Пользователи' },
  { value: 'deposits', label: 'Пополнения' },
  { value: 'purchases', label: 'Покупки' },
]

export default function StatisticsPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tab = (pathname.split('/')[2] ?? '') as Tab

  return (
    <>
      <PageHead title="Статистика" />
      <div className="stats-tabs">
        <Segmented<Tab> options={TABS} value={TABS.some((t) => t.value === tab) ? tab : ''} onChange={(t) => navigate(`/statistics${t ? `/${t}` : ''}`)} label="Раздел статистики" />
      </div>
      <Outlet />
    </>
  )
}
