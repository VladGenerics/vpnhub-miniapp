import type { Subscription } from '@vpnhub/shared'
import { Section, Cell } from '../../components/List'
import { DeviceIcon } from '../../components/DeviceIcon'
import { platformOf, slotTitle } from '../../lib/device'
import { date } from '../../lib/format'

export function DevicesTab({ sub }: { sub: Subscription }) {
  const occupied = sub.slots.filter((s) => s.is_occupied)
  const free = sub.slots.filter((s) => !s.is_occupied)

  return (
    <div className="tab-content">
      <Section
        title={`Занято ${occupied.length} из ${sub.slots.length} слотов`}
        footer="Слот занимается автоматически, когда новое устройство подключается по ссылке подписки"
      >
        {occupied.map((s) => (
          <Cell
            key={s.id}
            to={`/device/${s.id}`}
            icon={<DeviceIcon platform={platformOf(s.platform)} />}
            title={slotTitle(s)}
            subtitle={s.first_connection_at ? `подключено ${date(s.first_connection_at)}` : s.agent}
          />
        ))}
        {free.map((s) => (
          <Cell key={s.id} icon={<span className="slot-empty">+</span>} title={<span className="muted">Свободный слот</span>} subtitle="Ожидает подключения" />
        ))}
      </Section>
    </div>
  )
}
