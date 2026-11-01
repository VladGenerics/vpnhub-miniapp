import type { Subscription } from '@vpnhub/shared'
import { Hero } from '../../components/Page'
import { SwipeTabs } from '../../components/SwipeTabs'
import { E } from '../../data/emoji'
import { MainTab } from './MainTab'
import { DevicesTab } from './DevicesTab'

export function ActiveSubscription({ sub }: { sub: Subscription }) {
  const occupied = sub.slots.filter((s) => s.is_occupied).length
  return (
    <>
      <Hero emoji={E.vTile} title="Меню подписки" subtitle="Здесь вы можете управлять подпиской" size={112} />
      <SwipeTabs
        tabs={[
          { key: 'main', label: 'Основное', content: <MainTab sub={sub} /> },
          { key: 'devices', label: 'Устройства', badge: `${occupied}/${sub.slots.length}`, content: <DevicesTab sub={sub} /> },
        ]}
      />
    </>
  )
}
