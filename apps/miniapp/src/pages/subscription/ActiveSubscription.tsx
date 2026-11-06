import type { Subscription } from '@vpnhub/shared'
import { Hero } from '../../components/Page'
import { useIsTwoCol } from '../../hooks/useMediaQuery'
import { SwipeTabs } from '../../components/SwipeTabs'
import { MainTab } from './MainTab'
import { DevicesTab } from './DevicesTab'

export function ActiveSubscription({ sub }: { sub: Subscription }) {
  const occupied = sub.slots.filter((s) => s.is_occupied).length
  const twoCol = useIsTwoCol()
  const hero = <Hero emoji="logo" title="Меню подписки" subtitle="Здесь вы можете управлять подпиской" size={112} />
  // на ПК вкладки не нужны: подписка и устройства видны рядом
  if (twoCol)
    return (
      <>
        {hero}
        <MainTab sub={sub} aside={<DevicesTab sub={sub} />} />
      </>
    )
  return (
    <>
      {hero}
      <SwipeTabs
        tabs={[
          { key: 'main', label: 'Основное', content: <MainTab sub={sub} /> },
          { key: 'devices', label: 'Устройства', badge: `${occupied}/${sub.slots.length}`, content: <DevicesTab sub={sub} /> },
        ]}
      />
    </>
  )
}
