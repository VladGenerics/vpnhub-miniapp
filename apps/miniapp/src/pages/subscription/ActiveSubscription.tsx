import { useLocation, useNavigate } from 'react-router-dom'
import type { Subscription } from '@vpnhub/shared'
import { Hero } from '../../components/Page'
import { useIsTwoCol } from '../../hooks/useMediaQuery'
import { SwipeTabs } from '../../components/SwipeTabs'
import { MainTab } from './MainTab'
import { DevicesTab } from './DevicesTab'
import { draftOf } from '../../lib/draft'

export function ActiveSubscription({ sub }: { sub: Subscription }) {
  const occupied = sub.slots.filter((s) => s.is_occupied).length
  const twoCol = useIsTwoCol()
  const { pathname, search, state } = useLocation()
  const navigate = useNavigate()
  // открытая вкладка хранится в записи истории: «Назад» со страницы устройства возвращает на «Устройства»
  const savedTab = (state as { tab?: string } | null)?.tab
  const hero = <Hero emoji="logo" title="Меню подписки" subtitle="Здесь вы можете управлять подпиской" size={112} />
  // на ПК вкладки не нужны: по макету заголовок слева, сводка подписки и под ней подключение устройств
  if (twoCol)
    return (
      <>
        <header className="page-head">
          <h1>Подписка</h1>
        </header>
        <MainTab sub={sub} aside={<DevicesTab sub={sub} desktop />} />
      </>
    )
  return (
    <>
      {hero}
      <SwipeTabs
        // вернулись с пополнения посреди докупки слотов - сразу на «Устройства»
        initial={draftOf('slots')?.resume ? 'devices' : (savedTab ?? 'main')}
        onChange={(tab) => navigate(pathname + search, { replace: true, state: { ...(state as object | null), tab } })}
        tabs={[
          { key: 'main', label: 'Основное', content: <MainTab sub={sub} /> },
          { key: 'devices', label: 'Устройства', badge: `${occupied}/${sub.slots.length}`, content: <DevicesTab sub={sub} /> },
        ]}
      />
    </>
  )
}
