import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import type { DeviceSlot, Subscription } from '@vpnhub/shared'
import { Cell } from '../../components/List'
import { DeviceIcon } from '../../components/DeviceIcon'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { Button, Stepper } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { api } from '../../api'
import { useDeleteSlot } from '../../api/queries'
import { useQueryClient } from '@tanstack/react-query'
import { platformOf, slotTitle } from '../../lib/device'
import { date, devicesWord, plural } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { useSingleFlight } from '../../hooks/useSingleFlight'

// сколько устройств видно сразу, остальные - по кнопке
const VISIBLE = 6

const freeWord = (n: number) => `${n} ${plural(n, ['свободный слот', 'свободных слота', 'свободных слотов'])}`

/**
 * Устройства истёкшей подписки: они никуда не делись и входят в цену новой покупки.
 * Подключённые - строками, свободные слоты одинаковые - одной строкой с числом.
 * Ненужное удаляется, число устройств и цена сразу уменьшаются
 */
export function ExpiredDevices({ sub }: { sub: Subscription }) {
  const remove = useDeleteSlot()
  const qc = useQueryClient()
  const toast = useToast()
  const once = useSingleFlight()
  const [expanded, setExpanded] = useState(false)
  // что удаляем: одно устройство или несколько свободных слотов
  const [target, setTarget] = useState<DeviceSlot | null>(null)
  const [freeOpen, setFreeOpen] = useState(false)
  const [freeCount, setFreeCount] = useState(1)
  const [busy, setBusy] = useState(false)

  const n = sub.slots.length
  const occupied = sub.slots.filter((s) => s.is_occupied)
  const free = sub.slots.filter((s) => !s.is_occupied)
  // последний слот бэкенд удалить не даёт, его можно только освободить
  const canDelete = n > 1
  const maxFree = Math.min(free.length, n - 1)
  const hidden = occupied.length - VISIBLE

  const removeOne = () =>
    once((done) =>
      remove.mutate(target!.id, {
        onSettled: done,
        onSuccess: () => {
          haptic.notify('warning')
          setTarget(null)
          toast('Устройство удалено, цена пересчитана', E.check)
        },
        onError: (e) => {
          haptic.notify('error')
          toast(e.message || 'Не удалось удалить', E.warning)
        },
      }),
    )

  // отдельной ручки на пачку нет: удаляем по одному, при ошибке останавливаемся и показываем, сколько успели
  const removeFree = () =>
    once(async (done) => {
      setBusy(true)
      let ok = 0
      try {
        for (const s of free.slice(0, freeCount)) {
          await api.deleteSlot(s.id)
          ok++
        }
        haptic.notify('warning')
        toast(`Удалено: ${freeWord(ok)}, цена пересчитана`, E.check)
        setFreeOpen(false)
      } catch (e) {
        haptic.notify('error')
        toast(`${ok ? `Удалено ${ok}, дальше ошибка: ` : ''}${(e as Error).message || 'не удалось удалить'}`, E.warning)
      } finally {
        await qc.invalidateQueries({ queryKey: ['subscription'] })
        setBusy(false)
        done()
      }
    })

  const trash = (onClick: () => void, label: string) =>
    canDelete && (
      <button
        className="icon-btn is-danger"
        aria-label={label}
        onClick={() => {
          haptic.tap()
          onClick()
        }}
      >
        <LuTrash2 size={18} />
      </button>
    )

  return (
    <>
      <section className="section expired-devices">
        <h3 className="section-title">
          Ваши устройства · {n} {devicesWord(n)}
        </h3>
        {canDelete && (
          <div className="notice is-info devices-notice">
            <span className="notice-emoji">💡</span>
            <span>
              Подписка закончилась {date(sub.expires_at)}, устройства сохранены и входят в цену. <b>Удалите ненужные, и стоимость подписки уменьшится</b>
            </span>
          </div>
        )}
        <div className="section-card devices-grid">
          {(expanded ? occupied : occupied.slice(0, VISIBLE)).map((s) => (
            <Cell
              key={s.id}
              icon={<DeviceIcon platform={platformOf(s.platform)} />}
              title={slotTitle(s)}
              subtitle={s.first_connection_at ? `подключено ${date(s.first_connection_at)}` : s.agent}
              after={trash(() => setTarget(s), 'Удалить устройство')}
            />
          ))}
          {free.length > 0 && (
            <Cell
              icon={<span className={`slot-empty ${free.length > 1 ? 'is-count' : ''}`}>{free.length > 1 ? free.length : '+'}</span>}
              title={<span className="muted">{free.length > 1 ? freeWord(free.length) : 'Свободный слот'}</span>}
              subtitle="Без устройства, тоже входят в цену"
              after={trash(() => {
                if (free.length === 1) return setTarget(free[0])
                setFreeCount(maxFree)
                setFreeOpen(true)
              }, 'Удалить свободные слоты')}
            />
          )}
        </div>
        {hidden > 0 && (
          <button
            className="link devices-more"
            onClick={() => {
              haptic.select()
              setExpanded((v) => !v)
            }}
          >
            {expanded ? 'Свернуть' : `Показать все устройства (${occupied.length})`}
          </button>
        )}
      </section>

      <Sheet open={!!target} onClose={() => setTarget(null)} expandable={false}>
        <div className="sheet-head">
          <Lottie name={E.warning} size={80} />
          <h2>Удалить устройство?</h2>
          <p>
            {target?.is_occupied ? slotTitle(target) : 'Свободный слот'} пропадёт из подписки, в новой покупке будет {n - 1} {devicesWord(n - 1)}
          </p>
        </div>
        <div className="sheet-actions">
          <Button variant="danger" stretched onClick={removeOne} disabled={remove.isPending}>
            Удалить
          </Button>
          <Button variant="ghost" stretched onClick={() => setTarget(null)}>
            Назад
          </Button>
        </div>
      </Sheet>

      <Sheet open={freeOpen} onClose={() => !busy && setFreeOpen(false)} expandable={false}>
        <div className="sheet-head">
          <Lottie name={E.warning} size={80} />
          <h2>Удалить свободные слоты</h2>
          <p>
            Слоты без устройства. После удаления в новой покупке будет {n - freeCount} {devicesWord(n - freeCount)}
          </p>
        </div>
        <div className="section-card">
          <div className="plan-row">
            <div className="cell-title">Сколько удалить</div>
            <Stepper value={freeCount} min={1} max={Math.max(1, maxFree)} onChange={setFreeCount} />
          </div>
        </div>
        <div className="sheet-actions">
          <Button variant="danger" stretched onClick={removeFree} disabled={busy}>
            {busy ? 'Удаляем...' : `Удалить ${freeWord(freeCount)}`}
          </Button>
          <Button variant="ghost" stretched onClick={() => setFreeOpen(false)} disabled={busy}>
            Назад
          </Button>
        </div>
      </Sheet>
    </>
  )
}
