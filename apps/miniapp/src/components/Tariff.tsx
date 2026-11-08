import { priceTiers, type Quote, type Tariffs } from '@vpnhub/shared'
import { AnimatedNumber } from './AnimatedNumber'
import { days as daysWord, devicesWord, plural, rub } from '../lib/format'
import { haptic } from '../lib/telegram'

const pct = (share: number) => `${Math.round(share * 100)} %`
// «от 1 дня», «от 10 дней»
const fromDays = (n: number) => `от ${n} дн.`

/**
 * Пары «срок - цена дня» из БД: видно, как тариф дешевеет с длительностью. Пар столько, сколько в БД.
 * Подсвечена пара, в которую попадает выбранный срок; нажатие ставит её срок
 */
// list - строками «срок, цена дня, выгода» (оформление на ПК), иначе компактными плитками в ряд
export function PriceLadder({ tariffs, days, onPick, list }: { tariffs: Tariffs; days: number; onPick?(days: number): void; list?: boolean }) {
  const tiers = priceTiers(tariffs)
  if (!tiers.length) return null
  // последняя пара, чей срок не больше выбранного
  const active = tiers.reduce((acc, p, i) => (p.min_days <= days ? i : acc), 0)
  return (
    <div className={`price-ladder ${list ? 'is-list' : ''}`} role="list" aria-label="Цена дня в зависимости от срока">
      {tiers.map((p, i) => {
        const save = 1 - p.price_per_day / tiers[0].price_per_day
        const note = save > 0.004 ? `−${pct(save)}` : 'базовая'
        return (
          <button
            key={p.min_days}
            title={list ? undefined : i ? `дешевле на ${pct(save)}` : 'базовая цена'}
            type="button"
            role="listitem"
            className={`price-step ${i === active ? 'is-active' : ''}`}
            disabled={!onPick}
            onClick={() => {
              haptic.select()
              onPick?.(p.min_days)
            }}
          >
            {list && <span className="price-step-dot" aria-hidden />}
            <span className="price-step-days">{list ? `от ${p.min_days} ${plural(p.min_days, ['дня', 'дней', 'дней'])}` : fromDays(p.min_days)}</span>
            <b className="price-step-price">
              {rub(p.price_per_day)}
              {list && <small> / день</small>}
            </b>
            {list && <span className={`price-step-note ${save > 0.004 ? 'is-save' : ''}`}>{note}</span>}
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
