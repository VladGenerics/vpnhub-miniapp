import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Lottie } from '../../components/Lottie'
import { Section, Cell } from '../../components/List'
import { Button, Chips, Stepper } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E, HERO_POOL } from '../../data/emoji'
import { NO_SUB_TITLES, PLAN } from '../../data/mock'
import { useApp } from '../../store/AppStore'
import { days, devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'

const TITLE_INTERVAL = 10_000
const PERIODS = [30, 90, 180, 365]

function RotatingTitle() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % NO_SUB_TITLES.length), TITLE_INTERVAL)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <h1 className="hero-title rotating" key={i}>
        {NO_SUB_TITLES[i]}
      </h1>
      <div className="title-dots" aria-hidden>
        {NO_SUB_TITLES.map((_, k) => (
          <span key={k} className={k === i ? 'is-active' : ''}>
            {k === i && <i key={i} style={{ animationDuration: `${TITLE_INTERVAL}ms` }} />}
          </span>
        ))}
      </div>
    </>
  )
}

const FEATURES = [
  { emoji: E.rocket, title: 'Высокая скорость', subtitle: 'Без ограничений по трафику' },
  { emoji: E.globe, title: 'Серверы в 12 странах', subtitle: 'Выбирайте ближайший' },
  { emoji: E.phone, title: `До ${PLAN.maxSlots} устройств`, subtitle: 'Одна ссылка на все устройства' },
  { emoji: E.handshake, title: 'Поддержка 24/7', subtitle: 'Ответим в течение 15 минут' },
]

export function NoSubscription() {
  const { balance, setHasSubscription } = useApp()
  const toast = useToast()
  const [emoji] = useState(() => HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)])
  const [devices, setDevices] = useState(3)
  const [period, setPeriod] = useState(30)
  const total = PLAN.pricePerDeviceDay * devices * period

  const subscribe = () => {
    haptic.notify('success')
    setHasSubscription(true)
    toast('Подписка оформлена', E.party)
  }

  return (
    <>
      <header className="hero">
        <div className="hero-emoji" style={{ width: 132, height: 132 }}>
          <Lottie name={emoji} size={132} />
        </div>
        <RotatingTitle />
        <p className="hero-subtitle">Оформите подписку и пользуйтесь VPN на всех своих устройствах</p>
      </header>

      <Section>
        {FEATURES.map((f) => (
          <Cell key={f.title} icon={<Lottie name={f.emoji} size={34} />} title={f.title} subtitle={f.subtitle} />
        ))}
      </Section>

      <Section title="Тариф" footer={`${rub(PLAN.pricePerDeviceDay)} в сутки за одно устройство`}>
        <div className="plan-row">
          <div>
            <div className="cell-title">Устройства</div>
            <div className="cell-subtitle">
              {devices} {devicesWord(devices)}
            </div>
          </div>
          <Stepper value={devices} min={1} max={PLAN.maxSlots} onChange={setDevices} />
        </div>
        <div className="plan-row is-column">
          <div className="cell-title">Период</div>
          <Chips items={PERIODS} value={period} onChange={setPeriod} render={(d) => days(d)} />
        </div>
      </Section>

      <div className="sticky-cta">
        <div className="sticky-cta-meta">
          <span>
            Баланс: <b>{rub(balance)}</b>
          </span>
          <Link to="/topup" className="link" onClick={() => haptic.tap()}>
            Пополнить
          </Link>
        </div>
        <Button stretched onClick={subscribe}>
          Оформить за <AnimatedNumber value={total} format={rub} duration={400} />
        </Button>
      </div>
    </>
  )
}
