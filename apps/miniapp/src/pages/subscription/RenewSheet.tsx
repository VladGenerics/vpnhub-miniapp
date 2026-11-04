import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { quote, type Subscription } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { Button, Chips, Stepper } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { useMe, useRenew, useTariffs } from '../../api/queries'
import { date, days, devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'

const PRESETS = [7, 14, 30, 90]
const DAY = 86_400_000

/** Продление заранее, без автопродления: дни прибавляются к текущему сроку, деньги списываются сразу */
export function RenewSheet({ sub, open, onClose }: { sub: Subscription; open: boolean; onClose(): void }) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const renew = useRenew()
  const toast = useToast()
  const [dayCount, setDayCount] = useState(30)

  useEffect(() => {
    if (open) setDayCount(sub.auto_renewal.days || 30)
  }, [open])

  const slots = sub.slots.length
  const q = tariffs ? quote(tariffs, slots, dayCount) : null
  const balance = me?.balance ?? 0
  const lacking = q ? Math.max(0, q.total - balance) : 0
  // общая доля скидки: за устройства и персональная/общая перемножаются
  const discount = q ? 1 - (1 - q.deviceDiscount) * (1 - q.discount) : 0
  const base = Math.max(Date.now(), +new Date(sub.expires_at))
  const newUntil = new Date(base + dayCount * DAY).toISOString()

  const submit = () =>
    renew.mutate(dayCount, {
      onSuccess: (s) => {
        haptic.notify('success')
        toast(`Продлено до ${date(s.expires_at)}`, E.party)
        onClose()
      },
      onError: (e) => {
        haptic.notify('error')
        toast(e.message || 'Не удалось продлить', E.warning)
      },
    })

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet-head">
        <Lottie name={E.rocket} size={72} />
        <h2>Продление</h2>
        <p>Дни добавятся к текущему сроку, оплата с баланса сразу</p>
      </div>

      <h3 className="section-title">Количество дней</h3>
      <div className="section-card">
        <div className="plan-row">
          <div className="cell-title">Продлить на</div>
          <Stepper value={dayCount} min={1} max={365} onChange={setDayCount} suffix="дн." />
        </div>
        <div className="plan-row is-column">
          <Chips items={PRESETS} value={PRESETS.includes(dayCount) ? dayCount : null} onChange={setDayCount} render={(d) => days(d)} />
        </div>
      </div>

      {q && (
        <>
          <h3 className="section-title">К оплате</h3>
          <div className="calc-card">
            <div className="calc-formula">
              <span>{rub(q.pricePerDay)}</span>
              <i>×</i>
              <span>
                {slots} {devicesWord(slots)}
              </span>
              <i>×</i>
              <span>{days(dayCount)}</span>
            </div>
            <div className="calc-total">
              <AnimatedNumber value={q.total} format={rub} duration={450} />
            </div>
            <div className="calc-hint">
              {discount > 0 && `скидка ${Math.round(discount * 100)} % · `}подписка будет до {date(newUntil)}
            </div>
          </div>
        </>
      )}

      {lacking > 0 && (
        <div className="notice">
          <Lottie name={E.warning} size={26} />
          <span>
            На балансе {rub(balance)}, не хватает {rub(lacking)}
          </span>
        </div>
      )}

      <div className="sheet-actions">
        {lacking > 0 ? (
          <Link
            to="/topup"
            className="btn btn-primary btn-l is-stretched"
            onClick={() => {
              haptic.tap()
              onClose()
            }}
          >
            Пополнить на {rub(Math.ceil(lacking))}
          </Link>
        ) : (
          <Button stretched onClick={submit} disabled={!q || renew.isPending}>
            {renew.isPending ? 'Продлеваем…' : q ? `Продлить за ${rub(q.total)}` : 'Продлить'}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
