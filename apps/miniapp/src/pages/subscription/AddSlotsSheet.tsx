import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { slotsQuote, type Subscription } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { LoadError } from '../../components/LoadError'
import { Button, Chips, Stepper } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { MAX_DEVICES } from '../../data/content'
import { useBuySlots, useMe, useTariffs } from '../../api/queries'
import { days, devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { consumeResume, draft, draftOf } from '../../lib/draft'

const PRESETS = [1, 2, 5, 10]

/** Докупка слотов к действующей подписке: платим за оставшийся срок, срок не меняется */
export function AddSlotsSheet({ sub, open, onClose }: { sub: Subscription; open: boolean; onClose(): void }) {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: tariffs, error: tariffsError, refetch: refetchTariffs, isFetching: tariffsFetching } = useTariffs()
  const buy = useBuySlots()
  const toast = useToast()
  const [count, setCount] = useState(1)
  // число ещё не трогали: первая чипса его заменяет, дальше прибавляет
  const fresh = useRef(true)

  useEffect(() => {
    if (!open) return
    // вернулись с пополнения - то же значение, что выбирали
    const saved = draftOf('slots')?.count
    setCount(saved ?? 1)
    fresh.current = saved === undefined
    consumeResume('slots')
  }, [open])

  const slots = sub.slots.length
  const room = Math.max(1, MAX_DEVICES - slots)
  const q = tariffs ? slotsQuote(tariffs, slots, count, sub.expires_at) : null
  // неизвестный баланс - не ноль: пока он не загрузился, доплату не считаем и купить не даём
  const balance = me?.balance
  const lacking = q && balance !== undefined ? Math.max(0, q.total - balance) : 0
  const discount = q && q.base > 0 && q.total < q.base ? 1 - q.total / q.base : 0

  const submit = () =>
    buy.mutate(count, {
      onSuccess: (s) => {
        draft.clear()
        haptic.notify('success')
        toast(`Слотов теперь ${s.slots.length}`, E.party)
        onClose()
      },
      onError: (e) => {
        haptic.notify('error')
        toast(e.message || 'Не удалось добавить слоты', E.warning)
      },
    })

  return (
    <Sheet open={open} onClose={onClose} expandable={false}>
      <div className="sheet-head">
        <Lottie name={E.phone} size={72} />
        <h2>Добавить слоты</h2>
        <p>Слот занимает новое устройство. Платите за оставшийся срок подписки, срок не меняется</p>
      </div>

      <h3 className="section-title">Сколько слотов добавить</h3>
      <div className="section-card">
        <div className="plan-row">
          <div>
            <div className="cell-title">Добавить</div>
            <div className="cell-subtitle">
              Сейчас {slots} {devicesWord(slots)}
            </div>
          </div>
          <Stepper
            value={count}
            min={1}
            max={room}
            onChange={(v) => {
              setCount(v)
              fresh.current = false
            }}
          />
        </div>
        <div className="plan-row is-column">
          {/* чипсы прибавляют: +10 дважды = 20. Первое нажатие заменяет начальную единицу, иначе +10 дало бы 11 */}
          <Chips
            items={PRESETS.filter((p) => p <= room)}
            value={null}
            onChange={(n) => {
              setCount((c) => Math.min(room, fresh.current ? n : c + n))
              fresh.current = false
            }}
            render={(n) => `+${n}`}
          />
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
                {count} {devicesWord(count)}
              </span>
              <i>×</i>
              <span>{days(q.daysLeft)}</span>
            </div>
            <div className="calc-total">
              <AnimatedNumber value={q.total} format={rub} duration={450} />
            </div>
            <div className="calc-hint">
              {discount > 0.005 && `скидка ${Math.round(discount * 100)} % · `}будет {slots + count} {devicesWord(slots + count)}
            </div>
          </div>
        </>
      )}

      {tariffsError && !tariffs && <LoadError text="Не удалось загрузить цены" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {tariffs && !q && <LoadError text="Тариф пока недоступен" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
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
              draft.set({ kind: 'slots', count, resume: true })
              haptic.tap()
              onClose()
            }}
          >
            Пополнить на {rub(Math.ceil(lacking))}
          </Link>
        ) : (
          <Button stretched onClick={submit} disabled={!q || balance === undefined || buy.isPending}>
            {buy.isPending ? 'Добавляем...' : q ? `Добавить за ${rub(q.total)}` : 'Добавить'}
          </Button>
        )}
        <Button stretched variant="ghost" onClick={onClose}>
          Назад
        </Button>
      </div>
    </Sheet>
  )
}
