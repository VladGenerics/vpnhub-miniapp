import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { demoState } from '../api/mock'
import { setTipEmoji, useTipEmoji } from '../lib/tipEmoji'
import { ALL_EMOJI } from '../data/emoji'
import { Lottie } from './Lottie'

// Панель состояний для показа на тестовых данных: подписка, срок, баланс, счета, слоты.
// Сейчас видна всем на демо (временно, для показа заказчику), скрыть на устройстве - ?states=0, вернуть - ?states=1.
// Отдельный чанк, только при тестовых данных: в боевую сборку не попадает.

const KEY = 'vpnhub.states-panel'
const DISCOUNT_TEXT = 'Персональное предложение для вас'
const DAY = 864e5
type Unit = 'd' | 'h' | 'm' | 's'
// поле, подпись, максимум (дни - до 365, как период подписки)
const UNITS: [Unit, string, number][] = [
  ['d', 'д', 365],
  ['h', 'ч', 23],
  ['m', 'м', 59],
  ['s', 'с', 59],
]

function enabled() {
  try {
    const p = new URLSearchParams(location.search).get('states')
    if (p === '1') localStorage.removeItem(KEY)
    if (p === '0') localStorage.setItem(KEY, 'off')
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

function Opts<T>({ items, value, onChange }: { items: [T, string][]; value: T | null; onChange(v: T): void }) {
  return (
    <div className="chips">
      {items.map(([v, label]) => (
        <button key={label} className={`chip ${v === value ? 'is-active' : ''}`} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function StatesPanel() {
  const [on] = useState(enabled)
  const [open, setOpen] = useState(false)
  const [st, setSt] = useState(() => demoState.get())
  // срок не читаем из данных, а помним последний выбранный
  const [left, setLeft] = useState<number | null>(null)
  const [dur, setDur] = useState<Record<Unit, string>>({ d: '', h: '', m: '', s: '' })
  const [discountText, setDiscountText] = useState(() => demoState.get().discountText || DISCOUNT_TEXT)
  const [discountPct, setDiscountPct] = useState('')
  const qc = useQueryClient()
  const tipEmoji = useTipEmoji()
  if (!on) return null

  const apply = (fn: () => void) => {
    fn()
    setSt(demoState.get())
    qc.invalidateQueries()
  }
  const applyCustom = () => {
    const n = (k: Unit) => Number(dur[k]) || 0
    const ms = (((n('d') * 24 + n('h')) * 60 + n('m')) * 60 + n('s')) * 1000
    apply(() => (setLeft(null), demoState.setExpires(ms)))
  }

  if (!open)
    return (
      <button className="states-fab" onClick={() => (setSt(demoState.get()), setOpen(true))} aria-label="Состояния">
        <LuSlidersHorizontal size={18} />
      </button>
    )

  return (
    <div className="states-panel">
      <div className="states-head">
        <b>Состояния</b>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
          <LuX size={16} />
        </button>
      </div>

      <div className="states-row">
        <span>Подписка</span>
        <Opts
          items={[
            ['active', 'Есть'],
            ['expired', 'Истекла'],
            ['none', 'Нет'],
          ]}
          value={st.hasSub ? 'active' : st.expired ? 'expired' : 'none'}
          onChange={(v) =>
            apply(() => {
              setLeft(v === 'expired' ? 0 : null)
              // истекла: подписка остаётся с устройствами, страница - «Возобновление подписки»
              if (v === 'expired') demoState.setExpires(0)
              else demoState.setSub(v === 'active')
            })
          }
        />
      </div>
      <div className="states-row">
        <span>Осталось</span>
        <Opts
          items={[
            [5 * 60_000, '5 мин'],
            [DAY, '1 день'],
            [16 * DAY, '16 дней'],
            [0, 'Истекла'],
          ]}
          value={left}
          onChange={(v) => apply(() => (setLeft(v), demoState.setExpires(v)))}
        />
        {/* свой остаток для проверки таймера, цены докупки и т. п.: 0 везде - подписка истекла */}
        <div className="states-custom">
          {UNITS.map(([key, label, max]) => (
            <label key={key}>
              <input
                inputMode="numeric"
                value={dur[key]}
                placeholder="0"
                aria-label={label}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setDur((d) => ({ ...d, [key]: v === '' ? '' : String(Math.min(max, Number(v))) }))
                }}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
              />
              {label}
            </label>
          ))}
          <button className="chip" onClick={applyCustom}>
            Задать
          </button>
        </div>
      </div>
      <div className="states-row">
        <span>Автопродление</span>
        <Opts
          items={[
            [true, 'Вкл'],
            [false, 'Выкл'],
          ]}
          value={st.hasSub ? st.autoRenew : null}
          onChange={(v) => apply(() => demoState.setAutoRenew(v))}
        />
      </div>
      <div className="states-row">
        <span>Всего слотов</span>
        <Opts
          items={[
            [1, '1'],
            [5, '5'],
            [20, '20'],
            [100, '100'],
          ]}
          value={st.hasSub ? st.total : null}
          onChange={(v) => apply(() => demoState.setSlots(v))}
        />
      </div>
      <div className="states-row">
        <span>Занято{st.hasSub ? `: ${st.occupied} из ${st.total}` : ''}</span>
        <Opts
          items={[
            [0, 'Нет'],
            [Math.max(1, Math.floor(st.total / 2)), 'Половина'],
            [st.total, 'Все'],
          ]}
          value={st.hasSub ? st.occupied : null}
          onChange={(v) => apply(() => demoState.setOccupied(v))}
        />
      </div>
      <div className="states-row">
        <span>Баланс</span>
        <Opts
          items={[
            [0, '0 ₽'],
            [450, '450 ₽'],
            [5000, '5 000 ₽'],
          ]}
          value={st.balance}
          onChange={(v) => apply(() => demoState.setBalance(v))}
        />
      </div>
      <div className="states-row">
        <span>Неоплаченные счета</span>
        <Opts
          items={[
            [true, 'Есть'],
            [false, 'Нет'],
          ]}
          value={st.unpaid}
          onChange={(v) => apply(() => demoState.setUnpaid(v))}
        />
      </div>
      <div className="states-row">
        <span>Пробная подписка</span>
        <Opts
          items={[
            [false, 'Доступна'],
            [true, 'Использована'],
          ]}
          value={st.trialUsed}
          onChange={(v) => apply(() => demoState.setTrialUsed(v))}
        />
      </div>
      <div className="states-row">
        <span>Индивидуальная скидка</span>
        <Opts
          items={[
            [0, 'Нет'],
            [10, '10 %'],
            [15, '15 %'],
            [25, '25 %'],
          ]}
          value={st.discount}
          onChange={(v) => apply(() => (setDiscountPct(''), demoState.setDiscount(v, discountText)))}
        />
        {/* свой процент и подпись скидки: подпись видна над тарифом */}
        <div className="states-custom states-discount">
          <label>
            <input
              inputMode="numeric"
              value={discountPct}
              placeholder={String(st.discount || 0)}
              aria-label="Скидка, %"
              onChange={(e) => setDiscountPct(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
            %
          </label>
          <input
            className="states-text"
            value={discountText}
            maxLength={255}
            placeholder="Подпись к скидке"
            aria-label="Подпись к скидке"
            onChange={(e) => setDiscountText(e.target.value)}
          />
          <button
            className="chip"
            onClick={() => apply(() => demoState.setDiscount(discountPct === '' ? st.discount || 15 : Number(discountPct), discountText))}
          >
            Задать
          </button>
        </div>
      </div>
      <div className="states-row">
        <span>Эмодзи в подсказке</span>
        {/* все эмодзи из паков одним списком, без деления по пакам */}
        <div className="states-emoji">
          <button className={`chip ${!tipEmoji ? 'is-active' : ''}`} onClick={() => setTipEmoji('')}>
            Без эмодзи
          </button>
          <div className="states-emoji-grid">
            {ALL_EMOJI.map((name) => (
              <button key={name} className={name === tipEmoji ? 'is-active' : ''} onClick={() => setTipEmoji(name)} aria-label={name} title={name}>
                <Lottie name={name} size={26} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
