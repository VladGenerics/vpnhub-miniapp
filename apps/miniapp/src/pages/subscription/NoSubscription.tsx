import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { quote } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Lottie } from '../../components/Lottie'
import { PriceLadder, CalcFormula } from '../../components/Tariff'
import { Cols } from '../../components/Page'
import { useIsTwoCol } from '../../hooks/useMediaQuery'
import { LoadError } from '../../components/LoadError'
import { Section, Cell } from '../../components/List'
import { Button, Chips, DiscountBadge, Stepper, discountReason } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E, HERO_POOL } from '../../data/emoji'
import { MAX_DAYS, MAX_DEVICES, NO_SUB_TITLES } from '../../data/content'
import { useMe, usePurchase, useTariffs } from '../../api/queries'
import { days, devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { draft, draftOf } from '../../lib/draft'
import { useSingleFlight } from '../../hooks/useSingleFlight'

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
            {k === i && (
              <svg key={i} viewBox="0 0 24 6" preserveAspectRatio="none">
                <rect width="24" height="6" style={{ animationDuration: `${TITLE_INTERVAL}ms` }} />
              </svg>
            )}
          </span>
        ))}
      </div>
    </>
  )
}

const FEATURES = [
  { emoji: E.rocket, title: 'Высокая скорость', subtitle: 'Без ограничений по трафику' },
  { emoji: E.globe, title: 'Серверы в 12 странах', subtitle: 'Выбирайте ближайший' },
  { emoji: E.phone, title: 'Сколько нужно устройств', subtitle: 'Одна ссылка на все, число выбираете сами' },
  { emoji: E.handshake, title: 'Поддержка 24/7', subtitle: 'Ответим в течение 15 минут' },
]

export function NoSubscription() {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: tariffs, error: tariffsError, refetch: refetchTariffs, isFetching: tariffsFetching } = useTariffs()
  const purchase = usePurchase()
  const toast = useToast()
  const [emoji] = useState(() => HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)])
  // выбор переживает уход на пополнение и обратно
  const [devices, setDevices] = useState(() => draftOf('new')?.devices ?? 3)
  const [period, setPeriod] = useState(() => draftOf('new')?.days ?? 30)
  // вернулись на форму - флаг «вернуться к оформлению» снимаем, числа помним
  useEffect(() => draft.set({ kind: 'new', devices, days: period }), [devices, period])
  const q = tariffs ? quote(tariffs, devices, period) : null
  // баланс неизвестен (не загрузился) - это не ноль: доплату не считаем, кнопку не включаем
  const balance = me?.balance
  const enough = q && balance !== undefined ? q.total <= balance : false
  const lacking = q && balance !== undefined && !enough ? Math.ceil(q.total - balance) : 0
  const noPrice = !!tariffs && !q
  // общая доля скидки: за устройства и по акции перемножаются
  const discount = q ? 1 - (1 - q.deviceDiscount) * (1 - q.discount) : 0
  const twoCol = useIsTwoCol()

  // черновик снимает сам хук usePurchase, здесь только отклик
  const once = useSingleFlight()
  const subscribe = () =>
    once((done) =>
      purchase.mutate(
        { days: period, devices },
        {
          onSettled: done,
          onSuccess: () => {
            haptic.notify('success')
            toast('Подписка оформлена', E.party)
          },
          onError: (e) => {
            haptic.notify('error')
            toast(e.message || 'Не удалось оформить подписку', E.warning)
          },
        },
      ),
    )
  // уходим пополнять: на странице оплаты будет «Вернуться к оформлению»
  const markResume = () => {
    haptic.tap()
    draft.set({ kind: 'new', devices, days: period, resume: true })
  }

  const hero = (
    <header className="hero">
      <div className="hero-emoji" style={{ width: 132, height: 132 }}>
        <Lottie name={emoji} size={132} />
      </div>
      <RotatingTitle />
      <p className="hero-subtitle">Оформите подписку и пользуйтесь VPN на всех своих устройствах</p>
    </header>
  )
  const features = FEATURES.map((f) => <Cell key={f.title} icon={<Lottie name={f.emoji} size={34} />} title={f.title} subtitle={f.subtitle} />)
  const planRows = (
    <>
      <div className="plan-row">
        <div>
          <div className="cell-title">Устройства</div>
          <div className="cell-subtitle">
            {devices} {devicesWord(devices)}
          </div>
        </div>
        <Stepper value={devices} min={1} max={MAX_DEVICES} onChange={setDevices} />
      </div>
      <div className="plan-row">
        <div className="cell-title">Период</div>
        <Stepper value={period} min={1} max={MAX_DAYS} onChange={setPeriod} suffix="дн." />
      </div>
      <div className="plan-row is-column">
        <Chips items={PERIODS} value={PERIODS.includes(period) ? period : null} onChange={setPeriod} render={(d) => days(d)} />
      </div>
    </>
  )
  const errors = (
    <>
      {tariffsError && !tariffs && <LoadError text="Не удалось загрузить цены" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {noPrice && <LoadError text="Тариф на этот срок пока недоступен" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {meError && !me && <LoadError text="Не удалось загрузить баланс" onRetry={() => refetchMe()} busy={meFetching} />}
    </>
  )
  const cta = (
    <div className="sticky-cta">
      <div className="sticky-cta-meta">
        <span>
          Баланс: <b>{balance !== undefined ? rub(balance) : '...'}</b>
        </span>
        <Link
          to={lacking > 0 ? `/topup?amount=${lacking}` : '/topup'}
          state={{ back: true, resume: lacking > 0 }}
          className="link"
          onClick={() => (lacking > 0 ? markResume() : haptic.tap())}
        >
          Пополнить
        </Link>
      </div>
      {lacking > 0 ? (
        <Link to={`/topup?amount=${lacking}`} state={{ back: true, resume: true }} className="btn btn-primary btn-l is-stretched" onClick={markResume}>
          Пополнить на {rub(lacking)}
        </Link>
      ) : (
        <Button stretched onClick={subscribe} disabled={!q || !enough || purchase.isPending}>
          Оформить за <AnimatedNumber value={q?.total ?? 0} format={rub} duration={400} />
        </Button>
      )}
    </div>
  )
  // расчёт: тариф крупно, скидка, формула и итог
  const summary = q && (
    <div className="calc-card buy-calc">
      <DiscountBadge percent={discount} reason={discountReason(devices, q.deviceDiscount, q.discount)} />
      <CalcFormula q={q} devices={devices} days={period} />
      <div className="calc-total">
        {q.total < q.base && <s className="calc-old">{rub(q.base)}</s>}
        <AnimatedNumber value={q.total} format={rub} duration={450} />
      </div>
    </div>
  )

  // прежняя раскладка: на ПК слева «Что входит», справа тариф; на телефоне одной колонкой.
  // В тарифе добавлены цены по сроку и крупный тариф с расчётом
  return (
    <>
      {hero}
      <Cols
        left={<Section title={twoCol ? 'Что входит' : undefined}>{features}</Section>}
        right={
          <>
            <Section title="Тариф">{planRows}</Section>
            {tariffs && (
              <Section title="Цена дня по сроку" footer="Чем дольше срок, тем дешевле день. Нажмите, чтобы выбрать срок">
                <div className="ladder-wrap">
                  <PriceLadder tariffs={tariffs} days={period} onPick={setPeriod} />
                </div>
              </Section>
            )}
            {summary}
            {errors}
            {cta}
          </>
        }
      />
    </>
  )
}
