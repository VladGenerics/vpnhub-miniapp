import { useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Cols, Page, useGoBack } from '../components/Page'
import { useIsTwoCol } from '../hooks/useMediaQuery'
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
  const goBack = useGoBack()
  const toast = useToast()
  const twoCol = useIsTwoCol()
  const [confirm, setConfirm] = useState(false)
  // освобождение и удаление одного слота взаимоисключающие, и каждое - один раз:
  // флаг в ref ставится синхронно, до перерисовки, поэтому ловит и быстрый двойной клик
  const busyRef = useRef(false)
  const busy = release.isPending || remove.isPending

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

  const onError = (e: Error) => {
    haptic.notify('error')
    toast(e.message || 'Не удалось выполнить действие', E.warning)
  }

  const once = (run: () => Promise<unknown>) => {
    if (busyRef.current) return
    busyRef.current = true
    run()
      .catch(() => {})
      .finally(() => (busyRef.current = false))
  }

  const doRelease = () =>
    once(() =>
      release.mutateAsync(slot.id).then(() => {
        haptic.notify('success')
        toast('Слот освобождён', E.sponge)
        goBack()
      }, onError),
    )

  const doRemove = () =>
    once(() =>
      remove.mutateAsync(slot.id).then(() => {
        haptic.notify('warning')
        setConfirm(false)
        toast('Слот удалён', E.check)
        goBack()
      }, onError),
    )

  return (
    <Page back wide>
      <header className="hero">
        <div className="hero-device">
          <DeviceIcon platform={platformOf(slot.platform)} size={84} />
        </div>
        <h1 className="hero-title">{slotTitle(slot)}</h1>
        {slot.agent && <p className="hero-subtitle">{slot.agent}</p>}
      </header>

      {/* на ПК: слева сведения об устройстве, справа действия со слотом */}
      <Cols
        left={
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
                  if (!(await copyText(slot.agent!))) {
                    haptic.notify('error')
                    return toast('Не удалось скопировать, выделите и скопируйте вручную', E.warning)
                  }
                  haptic.notify('success')
                  toast('User-Agent скопирован', E.check)
                }}
              >
                <span className="kv-key">User-Agent</span>
                <span className="kv-value mono">{slot.agent}</span>
              </button>
            )}
          </Section>
        }
        right={
          <>
            <Section title={twoCol ? 'Действия' : undefined} footer="Устройство отключится, а слот можно будет занять другим устройством">
              <Cell tone="accent" icon={<Lottie name={E.sponge} size={30} />} title="Освободить слот" onClick={doRelease} disabled={busy} />
            </Section>

            {/* без слотов подписка теряет смысл, последний можно только освободить */}
            {(active?.slots.length ?? 0) > 1 && (
              <Section>
                <Cell tone="danger" icon={<Lottie name={E.warning} size={30} />} title="Удалить слот" onClick={() => setConfirm(true)} disabled={busy} />
              </Section>
            )}
          </>
        }
      />

      <Sheet open={confirm} onClose={() => setConfirm(false)} expandable={false}>
        <div className="sheet-head">
          <Lottie name={E.warning} size={80} />
          <h2>🗑 Удалить слот</h2>
          <p>⚠ Это действие безвозвратно удалит текущий занятый слот из вашей подписки</p>
        </div>
        <div className="sheet-actions">
          <Button variant="danger" stretched onClick={doRemove} disabled={busy}>
            Подтвердить удаление
          </Button>
          <Button variant="ghost" stretched onClick={() => setConfirm(false)}>
            Назад
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
