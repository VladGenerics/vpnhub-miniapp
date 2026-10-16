import { useState } from 'react'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Lottie } from '../../components/Lottie'
import { Section, Cell } from '../../components/List'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { PLAN } from '../../data/mock'
import { useApp } from '../../store/AppStore'
import { copyText, date, days, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { AutoRenewSheet } from './AutoRenewSheet'

function StatusCard() {
  const total = Math.round((+PLAN.expiresAt - +PLAN.startedAt) / 864e5)
  const left = Math.max(0, Math.ceil((+PLAN.expiresAt - Date.now()) / 864e5))
  return (
    <div className="status-card">
      <div className="status-top">
        <span className="status-pill">
          <i /> Активна
        </span>
        <span className="status-until">до {date(PLAN.expiresAt)}</span>
      </div>
      <div className="status-left">
        Осталось{' '}
        <b>
          <AnimatedNumber value={left} format={days} from={0} duration={900} />
        </b>
      </div>
      <div className="progress">
        <span style={{ transform: `scaleX(${left / total})` }} />
      </div>
    </div>
  )
}

export function MainTab() {
  const { balance, autoRenew } = useApp()
  const toast = useToast()
  const [renewOpen, setRenewOpen] = useState(false)

  const copy = async () => {
    await copyText(PLAN.subscriptionUrl)
    haptic.notify('success')
    toast('Ссылка скопирована', E.link)
  }

  return (
    <div className="tab-content">
      <StatusCard />

      <Section title="Ссылка подписки" footer="Добавьте ссылку в приложение-клиент на любом устройстве">
        <button className="url-row" onClick={copy}>
          <Lottie name={E.link} size={30} />
          <span className="url-text">{PLAN.subscriptionUrl.replace('https://', '')}</span>
          <span className="copy-btn" aria-label="Скопировать">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
        </button>
      </Section>

      <Section>
        <Cell
          icon={<Lottie name={E.renewTile} size={32} />}
          title="Настройка автопродления"
          subtitle={autoRenew.enabled ? `Включено · на ${days(autoRenew.days)}` : 'Выключено'}
          onClick={() => setRenewOpen(true)}
          chevron
        />
        <Cell
          icon={<Lottie name={E.walletTile} size={32} />}
          title="Пополнить баланс"
          subtitle={`На балансе ${rub(balance)}`}
          to="/topup"
        />
        <Cell
          icon={<Lottie name={E.dollarTile} size={32} />}
          title="Тариф"
          after={<span className="muted">{rub(PLAN.pricePerDeviceDay)} / сутки за устройство</span>}
        />
      </Section>

      <AutoRenewSheet open={renewOpen} onClose={() => setRenewOpen(false)} />
    </div>
  )
}
