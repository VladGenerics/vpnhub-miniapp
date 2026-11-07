import { useState } from 'react'
import type { Subscription } from '@vpnhub/shared'
import { Section, Cell } from '../../components/List'
import { DeviceIcon } from '../../components/DeviceIcon'
import { platformOf, slotTitle } from '../../lib/device'
import { date, plural } from '../../lib/format'
import { draftOf } from '../../lib/draft'
import { haptic } from '../../lib/telegram'
import { AddSlotsSheet } from './AddSlotsSheet'

// сколько устройств видно сразу, остальные - по кнопке
const DEVICES_VISIBLE = 6
// до скольких свободных слотов показываем каждый отдельной строкой
const FREE_AS_ROWS = 3

export function DevicesTab({ sub }: { sub: Subscription }) {
  const occupied = sub.slots.filter((s) => s.is_occupied)
  const free = sub.slots.filter((s) => !s.is_occupied)
  // вернулись с пополнения посреди докупки - окно открывается само
  const [addOpen, setAddOpen] = useState(() => !!draftOf('slots')?.resume)
  const [expanded, setExpanded] = useState(false)
  const hidden = occupied.length - DEVICES_VISIBLE
  const deviceRows = (expanded ? occupied : occupied.slice(0, DEVICES_VISIBLE)).map((s) => (
    <Cell
      key={s.id}
      to={`/device/${s.id}`}
      icon={<DeviceIcon platform={platformOf(s.platform)} />}
      title={slotTitle(s)}
      subtitle={s.first_connection_at ? `подключено ${date(s.first_connection_at)}` : s.agent}
    />
  ))

  return (
    <div className="tab-content">
      <Section
        title={`Занято ${occupied.length} из ${sub.slots.length} слотов`}
        footer="Слот занимается автоматически, когда новое устройство подключается по ссылке подписки"
      >
        {/* раскрытый длинный список листается внутри карточки, а не растягивает страницу */}
        {expanded && hidden > 0 ? <div className="slots-scroll">{deviceRows}</div> : deviceRows}
        {hidden > 0 && (
          <Cell
            tone="accent"
            title={expanded ? 'Свернуть' : `Показать все устройства (${occupied.length})`}
            onClick={() => {
              haptic.select()
              setExpanded((v) => !v)
            }}
            chevron={false}
          />
        )}
        {/* свободные слоты одинаковые: пара - по строке, больше - одной строкой с числом */}
        {free.length <= FREE_AS_ROWS ? (
          free.map((s) => (
            <Cell
              key={s.id}
              icon={<span className="slot-empty">+</span>}
              title={<span className="muted">Свободный слот</span>}
              subtitle="Ожидает подключения"
            />
          ))
        ) : (
          <Cell
            icon={<span className="slot-empty is-count">{free.length}</span>}
            title={
              <span className="muted">{`${plural(free.length, ['Свободен', 'Свободно', 'Свободно'])} ${free.length} ${plural(free.length, ['слот', 'слота', 'слотов'])}`}</span>
            }
            subtitle="Ожидают подключения по ссылке"
          />
        )}
        <Cell
          tone="accent"
          icon={<span className="slot-empty is-add">+</span>}
          title="Добавить слоты"
          subtitle="Докупить к текущей подписке"
          onClick={() => setAddOpen(true)}
          chevron
        />
      </Section>
      <AddSlotsSheet sub={sub} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
