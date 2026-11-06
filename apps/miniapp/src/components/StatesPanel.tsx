import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { demoState } from '../api/mock'

// Панель состояний для показа на тестовых данных: подписка, срок, баланс, счета, слоты.
// Сейчас видна всем на демо (временно, для показа заказчику), скрыть на устройстве - ?states=0, вернуть - ?states=1.
// Отдельный чанк, только при тестовых данных: в боевую сборку не попадает.

const KEY = 'vpnhub.states-panel'
const DAY = 864e5

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
  const qc = useQueryClient()
  if (!on) return null

  const apply = (fn: () => void) => {
    fn()
    setSt(demoState.get())
    qc.invalidateQueries()
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
            [true, 'Есть'],
            [false, 'Нет'],
          ]}
          value={st.hasSub}
          onChange={(v) => apply(() => (setLeft(null), demoState.setSub(v)))}
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
        <span>Занято слотов</span>
        <Opts
          items={[
            [0, '0'],
            [2, '2'],
            [5, '5 из 5'],
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
    </div>
  )
}
