import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { quote, type Subscription } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { LoadError } from '../../components/LoadError'
import { Button, Stepper } from '../../components/Controls'
import { DiscountBadges, PersonalPromo } from '../../components/Promo'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { MAX_DAYS } from '../../data/content'
import { useMe, useRenew, useTariffs } from '../../api/queries'
import { date, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { consumeResume, draft, draftOf } from '../../lib/draft'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import { PriceLadder, CalcFormula } from '../../components/Tariff'

const DAY = 86_400_000

/** Продление заранее, без автопродления: дни прибавляются к текущему сроку, деньги списываются сразу */
export function RenewSheet({ sub, open, onClose }: { sub: Subscription; open: boolean; onClose(): void }) {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: tariffs, error: tariffsError, refetch: refetchTariffs, isFetching: tariffsFetching } = useTariffs()
  const renew = useRenew()
  const toast = useToast()
  const [dayCount, setDayCount] = useState(30)

  useEffect(() => {
    if (!open) return
    // вернулись с пополнения - то же значение, что выбирали
    setDayCount(draftOf('renew')?.days ?? (sub.auto_renewal.days || 30))
    consumeResume('renew')
  }, [open])

  const slots = sub.slots.length
  const q = tariffs ? quote(tariffs, slots, dayCount) : null
  // неизвестный баланс - не ноль: пока он не загрузился, доплату не считаем и продлить не даём
  const balance = me?.balance
  const lacking = q && balance !== undefined ? Math.max(0, q.total - balance) : 0
  const base = Math.max(Date.now(), +new Date(sub.expires_at))
  const newUntil = new Date(base + dayCount * DAY).toISOString()

  // черновик снимает сам хук useRenew, здесь только отклик
  const once = useSingleFlight()
  const submit = () =>
    once((done) =>
      renew.mutate(dayCount, {
        onSettled: done,
        onSuccess: (s) => {
          haptic.notify('success')
          toast(`Продлено до ${date(s.expires_at)}`, E.party)
          onClose()
        },
        onError: (e) => {
          haptic.notify('error')
          toast(e.message || 'Не удалось продлить', E.warning)
        },
      }),
    )

  return (
    <Sheet open={open} onClose={onClose} full>
      <div className="sheet-head">
        <Lottie name={E.rocket} size={72} />
        <h2>Продление</h2>
        <p>Дни добавятся к текущему сроку, оплата с баланса сразу</p>
      </div>

      <h3 className="section-title">Количество дней</h3>
      <div className="section-card">
        <div className="plan-row">
          <div className="cell-title">Продлить на</div>
          <Stepper value={dayCount} min={1} max={MAX_DAYS} onChange={setDayCount} suffix="дн." />
        </div>
      </div>

      {tariffs && (
        <>
          <h3 className="section-title">Цена дня по сроку</h3>
          <div className="ladder-wrap">
            <PriceLadder tariffs={tariffs} days={dayCount} onPick={setDayCount} />
          </div>
        </>
      )}

      {q && (
        <>
          <h3 className="section-title">К оплате</h3>
          <PersonalPromo tariffs={tariffs} />
          <div className="calc-card">
            <DiscountBadges q={q} devices={slots} />
            <CalcFormula q={q} devices={slots} days={dayCount} />
            <div className="calc-total">
              {q.total < q.base && <s className="calc-old">{rub(q.base)}</s>}
              <AnimatedNumber value={q.total} format={rub} duration={450} />
            </div>
            <div className="calc-hint">подписка будет до {date(newUntil)}</div>
          </div>
        </>
      )}

      {tariffsError && !tariffs && <LoadError text="Не удалось загрузить цены" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {tariffs && !q && <LoadError text="Тариф на этот срок пока недоступен" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {meError && !me && <LoadError text="Не удалось загрузить баланс" onRetry={() => refetchMe()} busy={meFetching} />}

      {lacking > 0 && balance !== undefined && (
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
            to={`/topup?amount=${Math.ceil(lacking)}`}
            state={{ back: true, resume: true }}
            className="btn btn-primary btn-l is-stretched"
            onClick={() => {
              draft.set({ kind: 'renew', days: dayCount, resume: true })
              haptic.tap()
              onClose()
            }}
          >
            Пополнить на {rub(Math.ceil(lacking))}
          </Link>
        ) : (
          <Button
            stretched
            className="btn-two-line"
            onClick={submit}
            disabled={!q || balance === undefined || renew.isPending}
            hint={!tariffs ? 'Загрузка цен' : !q ? 'Тариф недоступен' : balance === undefined && 'Загрузка баланса'}
          >
            <span>{renew.isPending ? 'Продлеваем...' : q ? `Продлить за ${rub(q.total)}` : 'Продлить'}</span>
            {/* сразу видно, с чего спишется оплата */}
            {balance !== undefined && !renew.isPending && <span className="btn-sub">на балансе {rub(balance)}</span>}
          </Button>
        )}
        <Button stretched variant="ghost" onClick={onClose}>
          Назад
        </Button>
      </div>
    </Sheet>
  )
}
