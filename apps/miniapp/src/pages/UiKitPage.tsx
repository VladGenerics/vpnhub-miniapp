import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '../api'
import { mockControls } from '../api/mock'
import { keys, useActiveSubscription, useMe } from '../api/queries'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Button, Chips, Stepper, Switch } from '../components/Controls'
import { DeviceIcon } from '../components/DeviceIcon'
import { Cell, Section } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Page } from '../components/Page'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { useCountdown } from '../hooks/useCountdown'
import { PLATFORM_LABEL, type Platform } from '../lib/device'
import { countdown, rub } from '../lib/format'
import { useApp, type ThemeMode } from '../store/AppStore'

const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[]

type Seg = 'one' | 'two' | 'three'

function ColorProfile() {
  const { themeMode, setThemeMode } = useApp()
  return (
    <Section title="Цветовой профиль" footer="Настройки сохраняются на этом устройстве. «Авто» — как в Telegram или в системе">
      <div className="plan-row is-column">
        <div className="cell-title">Тема</div>
        <Segmented<ThemeMode>
          label="Тема"
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { value: 'auto', label: 'Авто' },
            { value: 'dark', label: 'Тёмная' },
            { value: 'light', label: 'Светлая' },
          ]}
        />
      </div>
    </Section>
  )
}

function Controls() {
  const [on, setOn] = useState(true)
  const [n, setN] = useState(3)
  const [chip, setChip] = useState(30)
  const [radio, setRadio] = useState('a')
  const [seg, setSeg] = useState<Seg>('one')
  return (
    <>
      <Section title="Кнопки">
        <div className="ui-demo">
          <div className="ui-row">
            <Button size="m">Основная</Button>
            <Button size="m" variant="secondary">
              Вторичная
            </Button>
            <Button size="m" variant="danger">
              Опасная
            </Button>
            <Button size="m" variant="ghost">
              Прозрачная
            </Button>
          </div>
          <div className="ui-row">
            <Button size="s">Маленькая</Button>
            <Button size="s" variant="secondary">
              Маленькая
            </Button>
            <Button size="s" disabled>
              Недоступна
            </Button>
          </div>
          <Button stretched>Кнопка на всю ширину</Button>
        </div>
      </Section>

      <Section title="Переключатели">
        <Cell title="Переключатель" subtitle={on ? 'Включено' : 'Выключено'} after={<Switch checked={on} onChange={setOn} label="Переключатель" />} />
        <div className="plan-row">
          <div className="cell-title">Счётчик</div>
          <Stepper value={n} min={1} max={10} onChange={setN} />
        </div>
        <div className="plan-row is-column">
          <div className="cell-title">Чипсы</div>
          <Chips items={[7, 14, 30, 90]} value={chip} onChange={setChip} render={(v) => `${v} дн.`} />
        </div>
        <div className="plan-row is-column">
          <div className="cell-title">Сегмент-контрол</div>
          <Segmented<Seg>
            label="Пример"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'one', label: 'Первый' },
              { value: 'two', label: 'Второй' },
              { value: 'three', label: 'Третий' },
            ]}
          />
        </div>
        {['a', 'b'].map((k) => (
          <Cell
            key={k}
            title={`Радио-кнопка ${k.toUpperCase()}`}
            after={<span className={`radio ${radio === k ? 'is-on' : ''}`} />}
            onClick={() => setRadio(k)}
            chevron={false}
          />
        ))}
      </Section>
    </>
  )
}

function Inputs() {
  const [text, setText] = useState('')
  const [sum, setSum] = useState('500')
  return (
    <Section title="Поля ввода">
      <div className="ui-demo">
        <label className="text-input">
          <input placeholder="Текстовое поле" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      </div>
      <label className="amount-input">
        <input
          inputMode="numeric"
          value={sum}
          style={{ width: `${Math.max(1, sum.length) * 0.62}em` }}
          onChange={(e) => setSum(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-label="Сумма"
        />
        <span>₽</span>
      </label>
    </Section>
  )
}

function States() {
  const [target] = useState(() => Date.now() + 16 * 864e5 + 13 * 36e5 + 42 * 6e4)
  const left = useCountdown(new Date(target))
  const [num, setNum] = useState(450)
  return (
    <Section title="Состояния">
      <div className="ui-demo">
        <div className="status-card">
          <div className="status-top">
            <span className="status-pill">
              <i /> Активна
            </span>
            <span className="status-until">таймер</span>
          </div>
          <div className="status-left">
            Осталось <b className="countdown">{countdown(left)}</b>
          </div>
        </div>
        <div className="notice">
          <Lottie name={E.warning} size={26} />
          <span>Предупреждение: не хватает средств</span>
        </div>
        <div className="notice is-accent">
          <Lottie name={E.gift} size={26} />
          <span>Информационное сообщение</span>
        </div>
        <div className="ui-row is-center">
          <span className="balance-value is-small">
            <AnimatedNumber value={num} format={rub} duration={600} />
          </span>
          <Button size="s" variant="secondary" onClick={() => setNum(Math.round(Math.random() * 5000))}>
            Анимировать число
          </Button>
        </div>
        <div className="ui-row is-center">
          <span className="spinner" />
          <span className="muted">Загрузка</span>
        </div>
        <span className="skeleton" style={{ height: 56 }} />
      </div>
    </Section>
  )
}

function Overlays() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <Section title="Уведомления и окна">
      <Cell icon={<Lottie name={E.check} size={30} />} title="Показать уведомление" onClick={() => toast('Готово!', E.check)} chevron={false} />
      <Cell icon={<Lottie name={E.memo} size={30} />} title="Открыть окно" subtitle="На телефоне — шторка, на ПК — модальное окно" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="sheet-head">
          <Lottie name={E.party} size={80} />
          <h2>Пример окна</h2>
          <p>Шторку можно потянуть вверх, чтобы развернуть, или вниз, чтобы закрыть</p>
        </div>
        <div className="sheet-actions">
          <Button stretched onClick={() => setOpen(false)}>
            Понятно
          </Button>
        </div>
      </Sheet>
    </Section>
  )
}

function Lists() {
  return (
    <>
      <Section title="Ячейки списка" footer="Подпись под секцией">
        <Cell icon={<Lottie name={E.walletTile} size={32} />} title="Обычная ячейка" subtitle="С подзаголовком и переходом" to="/ui" />
        <Cell icon={<Lottie name={E.dollarTile} size={32} />} title="С текстом справа" after={<span className="muted">5 ₽ / сутки</span>} />
        <Cell tone="accent" icon={<Lottie name={E.sponge} size={30} />} title="Акцентное действие" onClick={() => {}} />
        <Cell tone="danger" icon={<Lottie name={E.warning} size={30} />} title="Опасное действие" onClick={() => {}} />
      </Section>
      <Section title="Иконки устройств">
        <div className="ui-demo ui-row">
          {PLATFORMS.map((p) => (
            <span key={p} className="ui-device">
              <DeviceIcon platform={p} />
              <small>{PLATFORM_LABEL[p]}</small>
            </span>
          ))}
        </div>
      </Section>
      <Section>
        <Cell icon={<Lottie name={E.starEyes} size={32} />} title="Анимированные эмодзи" subtitle="Все эмодзи из паков" to="/emoji" />
      </Section>
    </>
  )
}

/** Переключатели демо-данных — только когда приложение работает без бэкенда */
function DemoData() {
  const qc = useQueryClient()
  const { active } = useActiveSubscription()
  const { data: me } = useMe()
  const toast = useToast()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.subscription })
    qc.invalidateQueries({ queryKey: keys.me })
  }
  return (
    <Section title="Демо-данные" footer="Этот блок виден только в демо-режиме без бэкенда">
      <Cell
        icon={<Lottie name={E.gearTile} size={32} />}
        title="Подписка оформлена"
        after={
          <Switch
            checked={!!active}
            onChange={(v) => {
              mockControls.setHasSubscription(v)
              refresh()
            }}
            label="Подписка оформлена"
          />
        }
      />
      <Cell
        icon={<Lottie name={E.renewTile} size={32} />}
        title="Закончить подписку через 10 секунд"
        subtitle="Проверка таймера и автопродления"
        onClick={() => {
          mockControls.expireIn(10)
          refresh()
          toast('Подписка закончится через 10 секунд', E.check)
        }}
        chevron={false}
      />
      <div className="plan-row is-column">
        <div className="cell-title">Баланс{me ? `: ${rub(me.balance)}` : ''}</div>
        <Chips
          items={[0, 100, 450, 5000]}
          value={me?.balance ?? null}
          onChange={(v) => {
            mockControls.setBalance(v)
            refresh()
          }}
          render={(v) => rub(v)}
        />
      </div>
    </Section>
  )
}

/** Тестовый раздел: компоненты интерфейса и настройки цветового профиля */
export function UiKitPage() {
  return (
    <Page back>
      <header className="hero">
        <div className="hero-emoji" style={{ width: 96, height: 96 }}>
          <Lottie name={E.gearTile} size={96} />
        </div>
        <h1 className="hero-title">Оформление</h1>
        <p className="hero-subtitle">Цветовой профиль и компоненты интерфейса</p>
      </header>
      <ColorProfile />
      {USE_MOCKS && <DemoData />}
      <Controls />
      <Inputs />
      <States />
      <Overlays />
      <Lists />
    </Page>
  )
}
