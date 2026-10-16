import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { DeviceIcon } from '../components/DeviceIcon'
import { Sheet } from '../components/Sheet'
import { Lottie } from '../components/Lottie'
import { Button } from '../components/Controls'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { PLATFORM_LABEL, deviceName } from '../data/mock'
import { useApp } from '../store/AppStore'
import { copyText } from '../lib/format'
import { haptic } from '../lib/telegram'

export function DevicePage() {
  const { id } = useParams()
  const { devices, releaseSlot, deleteSlot } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const device = devices.find((d) => d.id === id)

  if (!device) return <Navigate to="/" replace />

  const rows: [string, string][] = [
    ['Устройство', deviceName(device)],
    ['Платформа', PLATFORM_LABEL[device.platform]],
    ['Модель', device.model],
    ['Версия ОС', device.osVersion],
  ]

  const release = () => {
    releaseSlot(device.id)
    haptic.notify('success')
    toast('Слот освобождён', E.sponge)
    navigate(-1)
  }

  const remove = () => {
    deleteSlot(device.id)
    haptic.notify('warning')
    setConfirm(false)
    toast('Слот удалён', E.check)
    navigate(-1)
  }

  return (
    <Page back>
      <header className="hero">
        <div className="hero-device">
          <DeviceIcon platform={device.platform} size={84} />
        </div>
        <h1 className="hero-title">{deviceName(device)}</h1>
        <p className="hero-subtitle">
          {device.lastSeen === 'в сети' ? <span className="online">в сети</span> : `был(а) ${device.lastSeen}`}
        </p>
      </header>

      <Section title="Информация">
        {rows.map(([k, v]) => (
          <div className="kv-row" key={k}>
            <span className="kv-key">{k}</span>
            <span className="kv-value">{v}</span>
          </div>
        ))}
        <button
          className="kv-row is-column"
          onClick={async () => {
            await copyText(device.userAgent)
            haptic.notify('success')
            toast('User-Agent скопирован', E.check)
          }}
        >
          <span className="kv-key">User-Agent</span>
          <span className="kv-value mono">{device.userAgent}</span>
        </button>
      </Section>

      <Section footer="Устройство отключится, а слот можно будет занять другим устройством">
        <Cell tone="accent" icon={<Lottie name={E.sponge} size={30} />} title="Освободить слот" onClick={release} />
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
          <Button variant="danger" stretched onClick={remove}>
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
