import { Section, Cell } from '../../components/List'
import { DeviceIcon } from '../../components/DeviceIcon'
import { deviceName } from '../../data/mock'
import { useApp } from '../../store/AppStore'

export function DevicesTab() {
  const { devices, slots } = useApp()
  const free = Math.max(0, slots - devices.length)

  return (
    <div className="tab-content">
      <Section
        title={`Занято ${devices.length} из ${slots} слотов`}
        footer="Слот занимается автоматически, когда новое устройство подключается по ссылке подписки"
      >
        {devices.map((d) => (
          <Cell
            key={d.id}
            to={`/device/${d.id}`}
            icon={<DeviceIcon platform={d.platform} />}
            title={deviceName(d)}
            subtitle={d.lastSeen === 'в сети' ? <span className="online">в сети</span> : `был(а) ${d.lastSeen}`}
          />
        ))}
        {Array.from({ length: free }, (_, i) => (
          <Cell
            key={`free-${i}`}
            icon={<span className="slot-empty">+</span>}
            title={<span className="muted">Свободный слот</span>}
            subtitle="Ожидает подключения"
          />
        ))}
      </Section>
    </div>
  )
}
