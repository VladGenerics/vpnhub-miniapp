import { LuBadgePercent, LuGift } from 'react-icons/lu'
import { activePersonal, type Quote, type Tariffs } from '@vpnhub/shared'
import { Lottie } from './Lottie'
import { useToast } from './Toast'
import { E } from '../data/emoji'
import { useActivateTrial, useMe, useSettings } from '../api/queries'
import { useSingleFlight } from '../hooks/useSingleFlight'
import { celebrate } from '../lib/confetti'
import { date, days, devicesWord } from '../lib/format'
import { haptic } from '../lib/telegram'

const pct = (share: number) => `${Math.round(share * 100)} %`

/**
 * Пробная подписка: один раз на пользователя, пока он ей не пользовался.
 * Выделена переливающейся рамкой и градиентным заголовком, чтобы её заметили раньше платного тарифа
 */
export function TrialOffer() {
  const { data: me } = useMe()
  const { data: settings } = useSettings()
  const trial = useActivateTrial()
  const toast = useToast()
  const once = useSingleFlight()
  if (!me || me.has_used_trial_subscription) return null

  const d = settings?.trial_days
  const n = settings?.trial_devices
  const terms = [d && d > 0 && days(d), n && n > 0 && `${n} ${devicesWord(n)}`].filter(Boolean).join(' на ')
  const activate = () =>
    once((done) => {
      haptic.tap('medium')
      // mutateAsync, а не колбэки mutate: после ответа страница сразу становится меню подписки,
      // карточка размонтируется, и колбэки mutate тогда не вызываются - пропадали конфетти и уведомление
      trial
        .mutateAsync()
        .then(() => {
          haptic.notify('success')
          // поток с краёв страницы: кнопки после ответа уже нет
          celebrate()
          toast('Пробная подписка активирована', E.party)
        })
        .catch((e: Error) => {
          haptic.notify('error')
          toast(e.message || 'Не удалось активировать пробную подписку', E.warning)
        })
        .finally(done)
    })

  return (
    <button className="trial-offer" onClick={activate} disabled={trial.isPending} aria-busy={trial.isPending}>
      <span className="trial-shine" aria-hidden />
      <Lottie name={E.vTile} size={44} />
      <span className="trial-text">
        <span className="trial-title">
          <span className="aurora-text">Пробная подписка</span>
        </span>
        <span className="trial-sub">{terms ? `${terms} бесплатно` : 'Попробуйте VPN бесплатно'}</span>
      </span>
      <span className="trial-cta">{trial.isPending ? <span className="spinner" aria-label="Активируем" /> : 'Получить'}</span>
    </button>
  )
}

/** Подпись индивидуальной скидки над расчётом: «Персональное предложение для вас» и на что скидка */
export function PersonalPromo({ tariffs }: { tariffs: Tariffs | undefined }) {
  const p = tariffs ? activePersonal(tariffs) : null
  if (!p) return null
  return (
    <div className="personal-promo">
      <Lottie name={E.giftTile} size={40} />
      <div>
        <div className="cell-title">{p.text || 'Для вас индивидуальная скидка'}</div>
        <div className="cell-subtitle">
          Скидка {pct(p.discount)} на тариф{p.expire_at ? ` до ${date(p.expire_at)}` : ''}
        </div>
      </div>
    </div>
  )
}

/** Плашки скидок над расчётом: за устройства и на тариф (индивидуальная или по акции) отдельно, они перемножаются */
export function DiscountBadges({ q, devices }: { q: Quote; devices: number }) {
  const byDevices = q.deviceDiscount > 0.0049
  const onTariff = q.discount > 0.0049
  if (!byDevices && !onTariff) return null
  return (
    <div className="discount-badges">
      {byDevices && (
        <div className="discount-badge">
          <LuBadgePercent size={18} />
          <span>
            Скидка <b>{pct(q.deviceDiscount)}</b> за {devices} {devicesWord(devices)}
          </span>
        </div>
      )}
      {onTariff && (
        <div className={`discount-badge ${q.personal ? 'is-personal' : ''}`}>
          {q.personal ? <LuGift size={17} /> : <LuBadgePercent size={18} />}
          <span>
            {q.personal ? 'Индивидуальная скидка' : 'Скидка по акции'} <b>{pct(q.discount)}</b>
          </span>
        </div>
      )}
    </div>
  )
}
