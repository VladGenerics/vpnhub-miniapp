import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Subscription } from '@vpnhub/shared'
import { LuCheck, LuCopy, LuQrCode, LuRefreshCw, LuSettings, LuWallet } from 'react-icons/lu'
import { Lottie } from '../../components/Lottie'
import { Button } from '../../components/Controls'
import { Section, Cell } from '../../components/List'
import { PlatformGuides } from '../../components/PlatformGuides'
import { QrCode } from '../../components/QrCode'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { keys, useMe } from '../../api/queries'
import { useCountdown } from '../../hooks/useCountdown'
import { useRenewal } from '../../hooks/useRenewal'
import { copyText, countdown, date, dateTimeLocal, days, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { draftOf } from '../../lib/draft'
import { AutoRenewSheet } from './AutoRenewSheet'
import { RenewSheet } from './RenewSheet'

/** Автопродление: включено ли и хватает ли на него денег */
function RenewStatus({ sub }: { sub: Subscription }) {
  const renewal = useRenewal(sub)
  const { is_enabled, days: renewDays } = sub.auto_renewal
  return (
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
              <Link to="/topup" state={{ back: true }} className="link" onClick={() => haptic.tap()}>
                Пополнить
              </Link>
            </>
          ) : (
            <span>Средств на балансе хватает · спишется {rub(renewal.cost)}</span>
          )}
        </div>
      )}
    </div>
  )
}

/** Остаток подписки, тикает раз в секунду. На нуле перезапрашиваем подписку и баланс: вдруг продлилась */
function useSubCountdown(sub: Subscription) {
  const qc = useQueryClient()
  return useCountdown(sub.expires_at, () => {
    qc.invalidateQueries({ queryKey: keys.subscription })
    qc.invalidateQueries({ queryKey: keys.me })
  })
}

/**
 * ПК: одна карточка по макету заказчика. Слева статус и точное время отключения,
 * в середине баланс и хватает ли на автопродление, справа действия; снизу строка автопродления
 */
function OverviewPanel({ sub, onRenew, onAutoRenew }: { sub: Subscription; onRenew(): void; onAutoRenew(): void }) {
  const left = useSubCountdown(sub)
  const renewal = useRenewal(sub)
  const { data: me } = useMe()
  const { is_enabled, days: renewDays } = sub.auto_renewal
  const lacking = renewal?.enabled ? Math.ceil(renewal.lacking) : 0

  return (
    <div className="panel sub-overview">
      <div className="sub-overview-main">
        <div className="sub-status">
          <span className="status-pill">
            <i /> Подписка активна
          </span>
          {/* «16 дней 16:34:11», без дней, когда их 0 */}
          <b className="sub-countdown countdown" aria-live="off">
            {countdown(left)}
          </b>
          <span className="sub-until">Отключится {dateTimeLocal(sub.expires_at)}</span>
        </div>

        <div className="sub-balance">
          <span className="sub-label">Баланс</span>
          <b className="sub-balance-value">{me ? rub(me.balance) : '...'}</b>
          {renewal?.enabled &&
            (lacking > 0 ? (
              <span className="sub-note">
                Для автопродления не хватает <b className="renew-lacking">{rub(lacking)}</b>
              </span>
            ) : (
              <span className="sub-note">Хватает на автопродление · спишется {rub(renewal.cost)}</span>
            ))}
          <Link to={lacking > 0 ? `/topup?amount=${lacking}` : '/topup'} state={{ back: true }} className="link" onClick={() => haptic.tap()}>
            Пополнить баланс
          </Link>
        </div>

        <div className="sub-actions">
          <Button stretched icon={<LuWallet size={20} />} onClick={onRenew}>
            Продлить подписку
          </Button>
          <Button stretched variant="secondary" size="m" icon={<LuSettings size={18} />} onClick={onAutoRenew}>
            Настроить автопродление
          </Button>
        </div>
      </div>

      <div className="sub-overview-foot">
        <LuRefreshCw size={18} />
        <span>
          Автопродление <b>{is_enabled ? 'включено' : 'выключено'}</b>
          {is_enabled && ` · на ${days(renewDays)}`}
        </span>
      </div>
    </div>
  )
}

function StatusCard({ sub, onRenew }: { sub: Subscription; onRenew(): void }) {
  const left = useSubCountdown(sub)

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

      <RenewStatus sub={sub} />

      <Button stretched className="status-renew" onClick={onRenew}>
        Продлить
      </Button>
    </div>
  )
}

// aside - устройства: на ПК идут правой колонкой под ссылкой подписки
export function MainTab({ sub, aside }: { sub: Subscription; aside?: ReactNode }) {
  const { data: me } = useMe()
  const toast = useToast()
  const [renewOpen, setRenewOpen] = useState(false)
  // вернулись с пополнения посреди продления - окно открывается само
  const [extendOpen, setExtendOpen] = useState(() => !!draftOf('renew')?.resume)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    if (!sub.url) return
    if (!(await copyText(sub.url))) {
      haptic.notify('error')
      return toast('Не удалось скопировать, выделите и скопируйте вручную', E.warning)
    }
    haptic.notify('success')
    setCopied(true)
    toast('Ссылка скопирована', E.link)
  }

  const link = sub.url && (
    <Section title="Ссылка подписки" footer="Добавьте ссылку в приложение-клиент на любом устройстве">
      <div className="url-row">
        <button className="url-copy" onClick={copy} aria-label="Скопировать ссылку">
          <Lottie name={E.link} size={30} />
          <span className="url-text">{sub.url.replace('https://', '')}</span>
          <span className={`copy-btn ${copied ? 'is-done' : ''}`} aria-label={copied ? 'Скопировано' : 'Скопировать'}>
            {copied ? <LuCheck key="done" className="copy-check" size={18} strokeWidth={2.6} /> : <LuCopy key="copy" size={18} />}
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
          <LuQrCode size={18} />
        </button>
      </div>
    </Section>
  )

  const settings = (
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
        state={{ back: true }}
      />
    </Section>
  )

  return (
    <div className="tab-content">
      {aside ? (
        // ПК: сверху сводка подписки во всю ширину, ниже подключение: ссылка и устройства
        <>
          <OverviewPanel sub={sub} onRenew={() => setExtendOpen(true)} onAutoRenew={() => setRenewOpen(true)} />
          <div className="panel">
            <h2 className="panel-title">Подключение устройств</h2>
            {sub.url && (
              <>
                <div className="link-bar">
                  <button className="link-field" onClick={copy} aria-label="Скопировать ссылку">
                    <Lottie name={E.link} size={26} />
                    <span className="url-text">{sub.url.replace('https://', '')}</span>
                  </button>
                  <Button variant="secondary" size="m" icon={copied ? <LuCheck size={18} strokeWidth={2.6} /> : <LuCopy size={18} />} onClick={copy}>
                    {copied ? 'Скопировано' : 'Скопировать ссылку'}
                  </Button>
                  <Button variant="secondary" size="m" icon={<LuQrCode size={18} />} onClick={() => setQrOpen(true)}>
                    Показать QR-код
                  </Button>
                </div>
                <p className="panel-hint">Добавьте ссылку в приложение-клиент на любом устройстве</p>
                <PlatformGuides className="guides-block" />
              </>
            )}
            {aside}
          </div>
        </>
      ) : (
        <>
          <StatusCard sub={sub} onRenew={() => setExtendOpen(true)} />
          {link}
          {sub.url && <PlatformGuides />}
          {settings}
        </>
      )}

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
            <Button stretched variant="ghost" onClick={() => setQrOpen(false)}>
              Назад
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
