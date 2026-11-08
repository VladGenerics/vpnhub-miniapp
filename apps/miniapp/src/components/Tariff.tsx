import { priceTiers, type Quote, type Tariffs } from '@vpnhub/shared'
import { AnimatedNumber } from './AnimatedNumber'
import { days as daysWord, devicesWord, rub } from '../lib/format'
import { haptic } from '../lib/telegram'

const pct = (share: number) => `${Math.round(share * 100)} %`
// «от 1 дня», «от 10 дней»
const fromDays = (n: number) => `от ${n} дн.`

/**
 * Пары «срок - цена дня» из БД: видно, как тариф дешевеет с длительностью. Пар столько, сколько в БД.
 * Подсвечена пара, в которую попадает выбранный срок; нажатие ставит её срок
 */
export function PriceLadder({ tariffs, days, onPick }: { tariffs: Tariffs; days: number; onPick?(days: number): void }) {
  const tiers = priceTiers(tariffs)
  if (!tiers.length) return null
  // последняя пара, чей срок не больше выбранного
  const active = tiers.reduce((acc, p, i) => (p.min_days <= days ? i : acc), 0)
  return (
    <div className="price-ladder" role="list" aria-label="Цена дня в зависимости от срока">
      {tiers.map((p, i) => {
        return (
          <button
            key={p.min_days}
            title={i ? `дешевле на ${pct(1 - p.price_per_day / tiers[0].price_per_day)}` : 'базовая цена'}
            type="button"
            role="listitem"
            className={`price-step ${i === active ? 'is-active' : ''}`}
            disabled={!onPick}
            onClick={() => {
              haptic.select()
              onPick?.(p.min_days)
            }}
          >
            <span className="price-step-days">{fromDays(p.min_days)}</span>
            <b className="price-step-price">{rub(p.price_per_day)}</b>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Расчёт одной строкой: тариф × устройства × дни. Тариф выделен акцентом и показан со всеми скидками,
 * рядом зачёркнута базовая цена дня, если срок или скидки её снизили
 */
export function CalcFormula({ q, devices, days }: { q: Quote; devices: number; days: number }) {
  const cheaper = q.finalPricePerDay < q.basePricePerDay - 0.004
  return (
    <div className="calc-formula">
      <span className="calc-tariff" title="Тариф за одно устройство в сутки">
        {cheaper && <s>{rub(q.basePricePerDay)}</s>}
        <AnimatedNumber value={q.finalPricePerDay} format={rub} duration={400} />
        <small>/день</small>
      </span>
      <i>×</i>
      <span>
        {devices} {devicesWord(devices)}
      </span>
      <i>×</i>
      <span>{daysWord(days)}</span>
    </div>
  )
}
