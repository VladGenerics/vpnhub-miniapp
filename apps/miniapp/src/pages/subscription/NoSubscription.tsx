import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { quote } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Lottie } from '../../components/Lottie'
import { Section, Cell } from '../../components/List'
import { Button, Chips, Stepper } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E, HERO_POOL } from '../../data/emoji'
import { MAX_DEVICES, NO_SUB_TITLES } from '../../data/content'
import { useMe, usePurchase, useTariffs } from '../../api/queries'
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
  { emoji: E.phone, title: `До ${MAX_DEVICES} устройств`, subtitle: 'Одна ссылка на все устройства' },
  { emoji: E.handshake, title: 'Поддержка 24/7', subtitle: 'Ответим в течение 15 минут' },
]

export function NoSubscription() {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const purchase = usePurchase()
  const toast = useToast()
  const [emoji] = useState(() => HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)])
  const [devices, setDevices] = useState(3)
  const [period, setPeriod] = useState(30)
  const q = tariffs ? quote(tariffs, devices, period) : null
  const balance = me?.balance ?? 0
  const enough = q ? q.total <= balance : false

  const subscribe = () =>
    purchase.mutate(
      { days: period, devices },
      {
        onSuccess: () => {
          haptic.notify('success')
          toast('Подписка оформлена', E.party)
        },
        onError: (e) => {
          haptic.notify('error')
          toast(e.message || 'Не удалось оформить подписку', E.warning)
        },
      },
    )

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

      <Section title="Тариф" footer={q ? `${rub(q.pricePerDay)} в сутки за одно устройство` : undefined}>
        <div className="plan-row">
          <div>
            <div className="cell-title">Устройства</div>
            <div className="cell-subtitle">
              {devices} {devicesWord(devices)}
            </div>
          </div>
          <Stepper value={devices} min={1} max={MAX_DEVICES} onChange={setDevices} />
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
        {q && !enough ? (
          <Link to="/topup" className="btn btn-primary btn-l is-stretched" onClick={() => haptic.tap()}>
            Пополнить на {rub(Math.ceil(q.total - balance))}
          </Link>
        ) : (
          <Button stretched onClick={subscribe} disabled={!q || purchase.isPending}>
            Оформить за <AnimatedNumber value={q?.total ?? 0} format={rub} duration={400} />
          </Button>
        )}
      </div>
    </>
  )
}
