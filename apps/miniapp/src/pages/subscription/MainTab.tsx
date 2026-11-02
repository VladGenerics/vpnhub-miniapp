import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { quote, type Subscription } from '@vpnhub/shared'
import { Lottie } from '../../components/Lottie'
import { Button } from '../../components/Controls'
import { Section, Cell } from '../../components/List'
import { QrCode } from '../../components/QrCode'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { keys, useMe, useTariffs } from '../../api/queries'
import { useCountdown } from '../../hooks/useCountdown'
import { copyText, countdown, date, days, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { AutoRenewSheet } from './AutoRenewSheet'
import { RenewSheet } from './RenewSheet'

/** Сколько стоит следующее автопродление и сколько на него не хватает */
function useRenewal(sub: Subscription) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  if (!me || !tariffs) return null
  const cost = quote(tariffs, sub.slots.length, sub.auto_renewal.days).total
  return { cost, balance: me.balance, lacking: Math.max(0, cost - me.balance) }
}

function StatusCard({ sub, onRenew }: { sub: Subscription; onRenew(): void }) {
  const qc = useQueryClient()
  // таймер дошёл до нуля, перезапрашиваем подписку: вдруг продлилась
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

      <Button stretched className="status-renew" onClick={onRenew}>
        Продлить
      </Button>
    </div>
  )
}

export function MainTab({ sub }: { sub: Subscription }) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const toast = useToast()
  const [renewOpen, setRenewOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    if (!sub.url) return
    await copyText(sub.url)
    haptic.notify('success')
    setCopied(true)
    toast('Ссылка скопирована', E.link)
  }

  return (
    <div className="tab-content">
      <StatusCard sub={sub} onRenew={() => setExtendOpen(true)} />

      {sub.url && (
        <Section title="Ссылка подписки" footer="Добавьте ссылку в приложение-клиент на любом устройстве">
          <div className="url-row">
            <button className="url-copy" onClick={copy} aria-label="Скопировать ссылку">
              <Lottie name={E.link} size={30} />
              <span className="url-text">{sub.url.replace('https://', '')}</span>
              <span className={`copy-btn ${copied ? 'is-done' : ''}`} aria-label={copied ? 'Скопировано' : 'Скопировать'}>
                {copied ? (
                  <svg key="done" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <path
                      className="copy-check"
                      d="M5 12.5l4.5 4.5L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg key="copy" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </span>
            </button>
            <button
              className="copy-btn"
              onClick={() => {
                haptic.tap()
                setQrOpen(true)
              }}
              aria-label="Показать QR-код"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M17 17h3v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
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
        <Cell icon={<Lottie name={E.walletTile} size={32} />} title="Пополнить баланс" subtitle={me ? `На балансе ${rub(me.balance)}` : ' '} to="/topup" />
        {tariffs && (
          <Cell
            icon={<Lottie name={E.dollarTile} size={32} />}
            title="Тариф"
            after={<span className="muted">{rub(quote(tariffs, 1, 1).pricePerDay)} / сутки за устройство</span>}
          />
        )}
      </Section>

      <RenewSheet sub={sub} open={extendOpen} onClose={() => setExtendOpen(false)} />
      <AutoRenewSheet sub={sub} open={renewOpen} onClose={() => setRenewOpen(false)} />
      {sub.url && (
        <Sheet open={qrOpen} onClose={() => setQrOpen(false)} expandable={false}>
          <div className="sheet-head">
            <h2>Ссылка подписки</h2>
            <p>Откройте камеру или приложение-клиент на другом устройстве и наведите на код</p>
          </div>
          <div className="qr-wrap">
            <QrCode value={sub.url} />
          </div>
          <div className="sheet-actions">
            <Button stretched onClick={copy}>
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
