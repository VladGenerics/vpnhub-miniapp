import { useEffect, useState } from 'react'
import { quote, type Subscription } from '@vpnhub/shared'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { Button, Chips, Stepper, Switch } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { MAX_DAYS } from '../../data/content'
import { useMe, useSetAutoRenewal, useTariffs } from '../../api/queries'
import { days, devicesWord, rub } from '../../lib/format'
import { haptic } from '../../lib/telegram'

const PRESETS = [7, 14, 30, 90]

export function AutoRenewSheet({ sub, open, onClose }: { sub: Subscription; open: boolean; onClose(): void }) {
  const { auto_renewal } = sub
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const save = useSetAutoRenewal()
  const toast = useToast()
  const [enabled, setEnabled] = useState(auto_renewal.is_enabled)
  const [dayCount, setDayCount] = useState(auto_renewal.days)

  useEffect(() => {
    if (open) {
      setEnabled(auto_renewal.is_enabled)
      setDayCount(auto_renewal.days)
    }
  }, [open])

  const slots = sub.slots.length
  const q = tariffs ? quote(tariffs, slots, dayCount) : null
  // неизвестный баланс - не ноль, предупреждение о нехватке только по настоящему балансу
  const balance = me?.balance
  const lacking = enabled && q && balance !== undefined ? Math.max(0, q.total - balance) : 0

  const submit = () =>
    save.mutate(
      { is_enabled: enabled, days: dayCount },
      {
        onSuccess: () => {
          haptic.notify('success')
          toast(enabled ? `Автопродление на ${days(dayCount)}` : 'Автопродление выключено', E.check)
          onClose()
        },
        onError: () => {
          haptic.notify('error')
          toast('Не удалось сохранить', E.warning)
        },
      },
    )

  return (
    <Sheet open={open} onClose={onClose} full>
      <div className="sheet-head">
        <Lottie name={E.renewTile} size={72} />
        <h2>Автопродление</h2>
        <p>Подписка продлится автоматически с баланса за сутки до окончания</p>
      </div>

      <div className="section-card">
        <div className="plan-row">
          <div>
            <div className="cell-title">Автопродление</div>
            <div className="cell-subtitle">{enabled ? 'Включено' : 'Выключено'}</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Автопродление" />
        </div>
      </div>

      {/* выключено - настройки недоступны и с клавиатуры, не только мышью */}
      <div className={`renew-config ${enabled ? '' : 'is-disabled'}`} inert={!enabled}>
        <h3 className="section-title">Количество дней</h3>
        <div className="section-card">
          <div className="plan-row">
            <div className="cell-title">Продлевать на</div>
            <Stepper value={dayCount} min={1} max={MAX_DAYS} onChange={setDayCount} suffix="дн." />
          </div>
          <div className="plan-row is-column">
            <Chips items={PRESETS} value={PRESETS.includes(dayCount) ? dayCount : null} onChange={setDayCount} render={(d) => days(d)} />
          </div>
        </div>

        {q && (
          <>
            <h3 className="section-title">Сумма списания</h3>
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
                <AnimatedNumber value={q.total} format={rub} whole duration={450} />
              </div>
              <div className="calc-hint">спишется при следующем продлении</div>
            </div>
          </>
        )}

        {lacking > 0 && (
          <div className="notice">
            <Lottie name={E.warning} size={26} />
            <span>
              На балансе {rub(balance ?? 0)}. Пополните ещё на {rub(lacking)}, чтобы продление прошло успешно
            </span>
          </div>
        )}
      </div>

      <div className="sheet-actions">
        <Button stretched onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button stretched variant="ghost" onClick={onClose}>
          Назад
        </Button>
      </div>
    </Sheet>
  )
}
