import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { slotsQuote, type Subscription } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { LoadError } from '../../components/LoadError'
import { Button, DiscountBadge, Stepper, discountReason } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { MAX_DEVICES } from '../../data/content'
import { useBuySlots, useMe, useTariffs } from '../../api/queries'
import { devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'
import { consumeResume, draft, draftOf } from '../../lib/draft'
import { useSingleFlight } from '../../hooks/useSingleFlight'

/** Докупка слотов к действующей подписке: платим за оставшийся срок, срок не меняется */
export function AddSlotsSheet({ sub, open, onClose }: { sub: Subscription; open: boolean; onClose(): void }) {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: tariffs, error: tariffsError, refetch: refetchTariffs, isFetching: tariffsFetching } = useTariffs()
  const buy = useBuySlots()
  const toast = useToast()
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!open) return
    // вернулись с пополнения - то же значение, что выбирали
    // сохранённое число - не больше свободного места: слоты могли докупить в другой вкладке
    const saved = draftOf('slots')?.count
    setCount(Math.min(Math.max(1, saved ?? 1), Math.max(1, MAX_DEVICES - sub.slots.length)))
    consumeResume('slots')
  }, [open])

  const slots = sub.slots.length
  // сколько ещё можно докупить; 0 - упёрлись в лимит, покупка закрыта
  const room = Math.max(0, MAX_DEVICES - slots)
  const full = room === 0
  const n = Math.min(count, Math.max(1, room))
  // остаток подписки идёт, пока окно открыто: цена пересчитывается раз в 30 секунд, а не застывает
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [open])
  const q = tariffs && !full ? slotsQuote(tariffs, slots, n, sub.expires_at, now) : null
  // неизвестный баланс - не ноль: пока он не загрузился, доплату не считаем и купить не даём
  const balance = me?.balance
  const lacking = q && balance !== undefined ? Math.max(0, q.total - balance) : 0

  // черновик снимает сам хук useBuySlots, здесь только отклик
  const once = useSingleFlight()
  const submit = () => {
    if (full) return
    once((done) =>
      buy.mutate(n, {
        onSettled: done,
        onSuccess: (s) => {
          haptic.notify('success')
          toast(`Слотов теперь ${s.slots.length}`, E.party)
          onClose()
        },
        onError: (e) => {
          haptic.notify('error')
          toast(e.message || 'Не удалось добавить слоты', E.warning)
        },
      }),
    )
  }

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
          <Stepper value={n} min={1} max={Math.max(1, room)} onChange={setCount} />
        </div>
      </div>

      {q && (
        <>
          <h3 className="section-title">К оплате</h3>
          <div className="calc-card">
            <DiscountBadge percent={q.deviceDiscount} reason={discountReason(q.devicesAfter, q.deviceDiscount, 0)} />
            <div className="calc-formula">
              {/* скидка за число устройств уменьшает сам тариф: старый зачёркнут */}
              <span>
                {q.deviceDiscount > 0 && <s className="calc-old">{rub(q.basePricePerDay)}</s>}
                {rub(q.pricePerDay)}/д
              </span>
              <i>×</i>
              <span>
                {n} {devicesWord(n)}
              </span>
              <i>×</i>
              {/* остаток подписки дробью: 2 дн. 12 ч = 2,5 дн. */}
              <span>{q.daysLeft.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} дн.</span>
            </div>
            <div className="calc-total">
              {q.total < q.base && <s className="calc-old">{rub(q.base)}</s>}
              <AnimatedNumber value={q.total} format={rub} duration={450} />
            </div>
            <div className="calc-hint">
              будет {q.devicesAfter} {devicesWord(q.devicesAfter)}
            </div>
          </div>
        </>
      )}

      {tariffsError && !tariffs && <LoadError text="Не удалось загрузить цены" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
      {full && <p className="section-footer">Достигнут максимум: {MAX_DEVICES} устройств в подписке</p>}
      {tariffs && !full && !q && <LoadError text="Тариф пока недоступен" onRetry={() => refetchTariffs()} busy={tariffsFetching} />}
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
              draft.set({ kind: 'slots', count: n, resume: true })
              haptic.tap()
              onClose()
            }}
          >
            Пополнить на {rub(Math.ceil(lacking))}
          </Link>
        ) : (
          <Button
            stretched
            onClick={submit}
            disabled={!q || balance === undefined || buy.isPending}
            hint={
              full ? `Максимум ${MAX_DEVICES} устройств` : !tariffs ? 'Загрузка цен' : !q ? 'Тариф недоступен' : balance === undefined && 'Загрузка баланса'
            }
          >
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
