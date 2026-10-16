import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Button, Chips } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { E } from '../data/emoji'
import { PROVIDERS, TOPUP_PRESETS } from '../data/mock'
import { useApp } from '../store/AppStore'
import { rub } from '../lib/format'
import { haptic } from '../lib/telegram'

const MIN = 50
const MAX = 100_000

export function TopUpPage() {
  const { balance, topUp } = useApp()
  const navigate = useNavigate()
  const [raw, setRaw] = useState('500')
  const [provider, setProvider] = useState(PROVIDERS[0].id)
  const [done, setDone] = useState<number | null>(null)

  const amount = Number(raw) || 0
  const error = raw && amount < MIN ? `Минимальная сумма — ${rub(MIN)}` : amount > MAX ? `Максимум — ${rub(MAX)}` : ''
  const valid = amount >= MIN && amount <= MAX

  const pay = () => {
    haptic.notify('success')
    topUp(amount)
    setDone(amount)
  }

  return (
    <Page back>
      <header className="balance-hero">
        <Lottie name={E.walletTile} size={64} />
        <div className="balance-label">Текущий баланс</div>
        <div className="balance-value">
          <AnimatedNumber value={balance} format={rub} from={0} duration={900} />
        </div>
      </header>

      <Section title="Сумма пополнения" footer={error ? <span className="error">{error}</span> : `От ${rub(MIN)} до ${rub(MAX)}`}>
        <label className={`amount-input ${error ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={raw}
            style={{ width: `${Math.max(1, raw.length) * 0.62}em` }}
            placeholder="0"
            onChange={(e) => setRaw(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="Сумма пополнения"
          />
          <span>₽</span>
        </label>
        <div className="plan-row is-column">
          <Chips items={TOPUP_PRESETS} value={amount} onChange={(v) => setRaw(String(v))} render={(v) => rub(v)} />
        </div>
      </Section>

      <Section title="Способ оплаты">
        {PROVIDERS.map((p) => (
          <Cell
            key={p.id}
            icon={<Lottie name={p.emoji} size={36} />}
            title={p.title}
            subtitle={p.subtitle}
            after={<span className={`radio ${provider === p.id ? 'is-on' : ''}`} />}
            onClick={() => setProvider(p.id)}
            chevron={false}
          />
        ))}
      </Section>

      <div className="sticky-cta">
        <Button stretched disabled={!valid} onClick={pay}>
          {valid ? `Пополнить на ${rub(amount)}` : 'Введите сумму'}
        </Button>
      </div>

      <Sheet open={done !== null} onClose={() => navigate(-1)} expandable={false}>
        <div className="sheet-head">
          <Lottie name={E.party} size={96} />
          <h2>Баланс пополнен</h2>
          <p>
            {done !== null && `+${rub(done)}`} зачислено. Теперь на балансе {rub(balance)}
          </p>
        </div>
        <div className="sheet-actions">
          <Button stretched onClick={() => navigate(-1)}>
            Готово
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
