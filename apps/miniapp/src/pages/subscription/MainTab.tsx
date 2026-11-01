import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { quote, type Subscription } from '@vpnhub/shared'
import { Lottie } from '../../components/Lottie'
import { Section, Cell } from '../../components/List'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { keys, useMe, useTariffs } from '../../api/queries'
import { useCountdown } from '../../hooks/useCountdown'
import { copyText, countdown, date, days, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { AutoRenewSheet } from './AutoRenewSheet'

/** Стоимость следующего автопродления и нехватка баланса для него */
function useRenewal(sub: Subscription) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  if (!me || !tariffs) return null
  const cost = quote(tariffs, sub.slots.length, sub.auto_renewal.days).total
  return { cost, balance: me.balance, lacking: Math.max(0, cost - me.balance) }
}

function StatusCard({ sub }: { sub: Subscription }) {
  const qc = useQueryClient()
  // таймер дошёл до нуля — запрашиваем актуальные данные (продлилась ли подписка)
  const left = useCountdown(sub.expires_at, () => {
    qc.invalidateQueries({ queryKey: keys.subscription })
    qc.invalidateQueries({ queryKey: keys.me })
  })
  const renewal = useRenewal(sub)
  const { is_enabled, days: renewDays } = sub.auto_renewal

  return (
    <div className="status-card">
      <div className="status-top">
        <span className="status-pill">
          <i /> Активна
        </span>
        <span className="status-until">до {date(sub.expires_at)}</span>
      </div>
      <div className="status-left">
        Осталось
        <b className="countdown" aria-live="off">
          {countdown(left)}
        </b>
      </div>

      <div className={`renew-status ${!is_enabled ? 'is-off' : renewal?.lacking ? 'is-warn' : 'is-ok'}`}>
        <div className="renew-status-row">
          <span>Автопродление</span>
          <b>{is_enabled ? `включено · на ${days(renewDays)}` : 'выключено'}</b>
        </div>
        {is_enabled && renewal && (
          <div className="renew-status-row">
            {renewal.lacking > 0 ? (
              <>
                <span>
                  Не хватает <b className="renew-lacking">{rub(renewal.lacking)}</b> из {rub(renewal.cost)}
                </span>
                <Link to="/topup" className="link" onClick={() => haptic.tap()}>
                  Пополнить
                </Link>
              </>
            ) : (
              <span>Средств на балансе хватает · спишется {rub(renewal.cost)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function MainTab({ sub }: { sub: Subscription }) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const toast = useToast()
  const [renewOpen, setRenewOpen] = useState(false)

  const copy = async () => {
    if (!sub.url) return
    await copyText(sub.url)
    haptic.notify('success')
    toast('Ссылка скопирована', E.link)
  }

  return (
    <div className="tab-content">
      <StatusCard sub={sub} />

      {sub.url && (
        <Section title="Ссылка подписки" footer="Добавьте ссылку в приложение-клиент на любом устройстве">
          <button className="url-row" onClick={copy}>
            <Lottie name={E.link} size={30} />
            <span className="url-text">{sub.url.replace('https://', '')}</span>
            <span className="copy-btn" aria-label="Скопировать">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
          </button>
        </Section>
      )}

      <Section>
        <Cell
          icon={<Lottie name={E.renewTile} size={32} />}
          title="Настройка автопродления"
          subtitle={sub.auto_renewal.is_enabled ? `Включено · на ${days(sub.auto_renewal.days)}` : 'Выключено'}
          onClick={() => setRenewOpen(true)}
          chevron
        />
        <Cell
          icon={<Lottie name={E.walletTile} size={32} />}
          title="Пополнить баланс"
          subtitle={me ? `На балансе ${rub(me.balance)}` : ' '}
          to="/topup"
        />
        {tariffs && (
          <Cell
            icon={<Lottie name={E.dollarTile} size={32} />}
            title="Тариф"
            after={<span className="muted">{rub(quote(tariffs, 1, 1).pricePerDay)} / сутки за устройство</span>}
          />
        )}
      </Section>

      <AutoRenewSheet sub={sub} open={renewOpen} onClose={() => setRenewOpen(false)} />
    </div>
  )
}
