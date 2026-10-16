import { useEffect, useState } from 'react'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { Sheet } from '../../components/Sheet'
import { Lottie } from '../../components/Lottie'
import { Button, Chips, Stepper, Switch } from '../../components/Controls'
import { useToast } from '../../components/Toast'
import { E } from '../../data/emoji'
import { PLAN } from '../../data/mock'
import { useApp } from '../../store/AppStore'
import { days, devicesWord, rub } from '../../lib/format'

const PRESETS = [7, 14, 30, 90]

export function AutoRenewSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { autoRenew, setAutoRenew, slots, balance } = useApp()
  const toast = useToast()
  const [enabled, setEnabled] = useState(autoRenew.enabled)
  const [dayCount, setDayCount] = useState(autoRenew.days)

  useEffect(() => {
    if (open) {
      setEnabled(autoRenew.enabled)
      setDayCount(autoRenew.days)
    }
  }, [open])

  // стоимость тарифа за одно устройство в сутки × количество устройств × количество дней
  const sum = PLAN.pricePerDeviceDay * slots * dayCount
  const lacking = enabled && sum > balance

  const save = () => {
    setAutoRenew({ enabled, days: dayCount })
    toast(enabled ? `Автопродление на ${days(dayCount)}` : 'Автопродление выключено', E.check)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
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

      <div className={`renew-config ${enabled ? '' : 'is-disabled'}`}>
        <h3 className="section-title">Количество дней</h3>
        <div className="section-card">
          <div className="plan-row">
            <div className="cell-title">Продлевать на</div>
            <Stepper value={dayCount} min={1} max={365} onChange={setDayCount} suffix="дн." />
          </div>
          <div className="plan-row is-column">
            <Chips items={PRESETS} value={PRESETS.includes(dayCount) ? dayCount : null} onChange={setDayCount} render={(d) => days(d)} />
          </div>
        </div>

        <h3 className="section-title">Сумма списания</h3>
        <div className="calc-card">
          <div className="calc-formula">
            <span>{rub(PLAN.pricePerDeviceDay)}</span>
            <i>×</i>
            <span>
              {slots} {devicesWord(slots)}
            </span>
            <i>×</i>
            <span>{days(dayCount)}</span>
          </div>
          <div className="calc-total">
            <AnimatedNumber value={sum} format={rub} duration={450} />
          </div>
          <div className="calc-hint">спишется при следующем продлении</div>
        </div>

        {lacking && (
          <div className="notice">
            <Lottie name={E.warning} size={26} />
            <span>
              На балансе {rub(balance)}. Пополните ещё на {rub(sum - balance)}, чтобы продление прошло успешно
            </span>
          </div>
        )}
      </div>

      <div className="sheet-actions">
        <Button stretched onClick={save}>
          Сохранить
        </Button>
      </div>
    </Sheet>
  )
}
