import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { DeviceIcon } from '../components/DeviceIcon'
import { Sheet } from '../components/Sheet'
import { Lottie } from '../components/Lottie'
import { Button } from '../components/Controls'
import { PageSkeleton } from '../components/States'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { useActiveSubscription, useDeleteSlot, useReleaseSlot } from '../api/queries'
import { PLATFORM_LABEL, platformOf, slotTitle } from '../lib/device'
import { copyText, dateTime } from '../lib/format'
import { haptic } from '../lib/telegram'

export function DevicePage() {
  const { id } = useParams()
  const { active, isPending } = useActiveSubscription()
  const release = useReleaseSlot()
  const remove = useDeleteSlot()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)

  if (isPending)
    return (
      <Page back>
        <PageSkeleton />
      </Page>
    )

  const slot = active?.slots.find((s) => s.id === Number(id) && s.is_occupied)
  if (!slot) return <Navigate to="/" replace />

  const rows: [string, string][] = [
    ['Устройство', slotTitle(slot)],
    ['Платформа', slot.platform || PLATFORM_LABEL[platformOf(slot.platform)]],
    ['Модель', slot.model ?? '—'],
    ['Версия ОС', slot.version_os ?? '—'],
  ]
  if (slot.first_connection_at) rows.push(['Подключено', dateTime(slot.first_connection_at)])

  const onError = () => {
    haptic.notify('error')
    toast('Не удалось выполнить действие', E.warning)
  }

  const doRelease = () =>
    release.mutate(slot.id, {
      onSuccess: () => {
        haptic.notify('success')
        toast('Слот освобождён', E.sponge)
        navigate(-1)
      },
      onError,
    })

  const doRemove = () =>
    remove.mutate(slot.id, {
      onSuccess: () => {
        haptic.notify('warning')
        setConfirm(false)
        toast('Слот удалён', E.check)
        navigate(-1)
      },
      onError,
    })

  return (
    <Page back>
      <header className="hero">
        <div className="hero-device">
          <DeviceIcon platform={platformOf(slot.platform)} size={84} />
        </div>
        <h1 className="hero-title">{slotTitle(slot)}</h1>
        {slot.agent && <p className="hero-subtitle">{slot.agent}</p>}
      </header>

      <Section title="Информация">
        {rows.map(([k, v]) => (
          <div className="kv-row" key={k}>
            <span className="kv-key">{k}</span>
            <span className="kv-value">{v}</span>
          </div>
        ))}
        {slot.agent && (
          <button
            className="kv-row is-column"
            onClick={async () => {
              await copyText(slot.agent!)
              haptic.notify('success')
              toast('User-Agent скопирован', E.check)
            }}
          >
            <span className="kv-key">User-Agent</span>
            <span className="kv-value mono">{slot.agent}</span>
          </button>
        )}
      </Section>

      <Section footer="Устройство отключится, а слот можно будет занять другим устройством">
        <Cell tone="accent" icon={<Lottie name={E.sponge} size={30} />} title="Освободить слот" onClick={doRelease} />
      </Section>

      <Section>
        <Cell tone="danger" icon={<Lottie name={E.warning} size={30} />} title="Удалить слот" onClick={() => setConfirm(true)} />
      </Section>

      <Sheet open={confirm} onClose={() => setConfirm(false)} expandable={false}>
        <div className="sheet-head">
          <Lottie name={E.warning} size={80} />
          <h2>🗑 Удалить слот</h2>
          <p>⚠ Это действие безвозвратно удалит текущий занятый слот из вашей подписки</p>
        </div>
        <div className="sheet-actions">
          <Button variant="danger" stretched onClick={doRemove} disabled={remove.isPending}>
            Подтвердить удаление
          </Button>
          <Button variant="secondary" stretched onClick={() => setConfirm(false)}>
            Закрыть
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
