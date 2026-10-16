import { Hero } from '../../components/Page'
import { SwipeTabs } from '../../components/SwipeTabs'
import { E } from '../../data/emoji'
import { useApp } from '../../store/AppStore'
import { MainTab } from './MainTab'
import { DevicesTab } from './DevicesTab'

export function ActiveSubscription() {
  const { devices, slots } = useApp()
  return (
    <>
      <Hero emoji={E.vTile} title="Меню подписки" subtitle="Здесь вы можете управлять подпиской" size={112} />
      <SwipeTabs
        tabs={[
          { key: 'main', label: 'Основное', content: <MainTab /> },
          { key: 'devices', label: 'Устройства', badge: `${devices.length}/${slots}`, content: <DevicesTab /> },
        ]}
      />
    </>
  )
}
