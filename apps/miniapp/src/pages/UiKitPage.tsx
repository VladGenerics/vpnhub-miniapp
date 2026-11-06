import { useState } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Button, Chips, Stepper, Switch } from '../components/Controls'
import { DeviceIcon } from '../components/DeviceIcon'
import { Cell, Section } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Hero, Page } from '../components/Page'
import { PalettePicker } from '../components/PalettePicker'
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

const THEME_HINT = 'Настройки сохраняются на этом устройстве. «Авто» — как в Telegram или в системе'

function ColorProfile() {
  const { themeMode, setThemeMode } = useApp()
  const theme = (
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
  )
  return (
    <Section title="Цветовой профиль" footer={THEME_HINT}>
      <div className="plan-row is-column">
        <div className="cell-title">Тема</div>
        {theme}
      </div>
      <div className="plan-row is-column">
        <div className="cell-title">Палитра</div>
        <PalettePicker />
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
        <div className="ui-sample">
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
      <div className="ui-sample">
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
      <div className="ui-sample">
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
      <Cell
        icon={<Lottie name={E.memo} size={30} />}
        title="Открыть окно"
        subtitle="На телефоне — шторка, на ПК — модальное окно"
        onClick={() => setOpen(true)}
      />
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
          <Button stretched variant="ghost" onClick={() => setOpen(false)}>
            Назад
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
        <div className="ui-sample ui-row">
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

// витрина компонентов нужна только при разработке, клиент видит тему и палитру
const SHOWCASE = import.meta.env.DEV

/** Оформление: тема и палитра. При разработке - ещё все компоненты */
export function UiKitPage() {
  return (
    <Page back wide className="is-narrow">
      <Hero emoji={E.gearTile} title="Оформление" subtitle="Тема и цвета приложения" size={96} />
      <ColorProfile />
      {SHOWCASE && (
        <>
          <Controls />
          <Inputs />
          <States />
          <Overlays />
          <Lists />
        </>
      )}
    </Page>
  )
}
