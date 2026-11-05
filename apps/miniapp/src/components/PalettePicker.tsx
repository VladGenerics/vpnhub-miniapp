import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { PALETTES, isHex } from '../lib/palette'
import { haptic } from '../lib/telegram'
import { Button } from './Controls'
import { Sheet } from './Sheet'
import { useApp } from '../store/AppStore'

/** Выбор палитры: готовые шаблоны и свой цвет (открывает окно выбора) */
export function PalettePicker() {
  const { palette, setPalette, accent, setAccent } = useApp()
  const [open, setOpen] = useState(false)
  // что было до окна: «Отменить» возвращает и цвет, и шаблон
  const before = useRef({ palette, accent })
  const select = (id: typeof palette) => {
    if (palette === id) return
    haptic.select()
    setPalette(id)
  }
  const openCustom = () => {
    haptic.tap()
    before.current = { palette, accent }
    if (palette !== 'custom') setPalette('custom')
    setOpen(true)
  }
  const cancel = () => {
    setAccent(before.current.accent)
    if (before.current.palette !== 'custom') setPalette(before.current.palette)
    setOpen(false)
  }
  return (
    <>
      <div className="palette-picker" role="radiogroup" aria-label="Цвет оформления">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={palette === p.id}
            className={`palette-option ${palette === p.id ? 'is-active' : ''}`}
            onClick={() => select(p.id)}
          >
            <span className="palette-swatch" style={{ background: p.swatch[0] }}>
              <i style={{ background: p.swatch[1] }} />
            </span>
            <span className="palette-name">{p.title}</span>
          </button>
        ))}
        <button
          role="radio"
          aria-checked={palette === 'custom'}
          aria-haspopup="dialog"
          className={`palette-option ${palette === 'custom' ? 'is-active' : ''}`}
          onClick={openCustom}
        >
          <span className="palette-swatch is-custom">
            <i style={{ background: accent }} />
          </span>
          <span className="palette-name">Свой</span>
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} expandable={false}>
        <div className="sheet-head">
          <h2>Свой цвет</h2>
          <p>Цвет меняется сразу, приложение за окном покажет, как он смотрится</p>
        </div>
        <ColorEditor />
        <div className="sheet-actions">
          <Button stretched onClick={() => setOpen(false)}>
            Готово
          </Button>
          <Button stretched variant="ghost" onClick={cancel}>
            Отменить
          </Button>
        </div>
      </Sheet>
    </>
  )
}

type Hsv = [h: number, s: number, v: number]

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, max ? (d / max) * 100 : 0, max * 100]
}

function hsvToHex([h, s, v]: Hsv) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    const c = (v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1)))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

/** Из вставленного текста оставляем один # и до 6 hex-знаков: «##FFFFFF», « #ff00aa; » -> «#ffffff», «#ff00aa» */
const cleanHex = (v: string) =>
  `#${v
    .replace(/[^0-9a-f]/gi, '')
    .toLowerCase()
    .slice(0, 6)}`

const clamp = (v: number) => Math.min(100, Math.max(0, v))

/** Точный выбор: квадрат насыщенность/яркость, ползунок оттенка и hex */
function ColorEditor() {
  const { accent, setAccent } = useApp()
  // оттенок храним отдельно: у серого и чёрного его нет, и без этого ползунок прыгал бы в 0
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(accent))
  const [text, setText] = useState(accent)
  const own = useRef(accent)

  useEffect(() => {
    setText(accent)
    // цвет сменили не здесь (быстрые цвета, другая вкладка) - пересчитываем ползунки
    if (accent !== own.current) setHsv(hexToHsv(accent))
    own.current = accent
  }, [accent])

  const apply = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next)
    own.current = hex
    setAccent(hex)
  }

  const pad = useRef<HTMLDivElement>(null)
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = pad.current!.getBoundingClientRect()
    // края отступают на радиус кружка, чтобы он не вылезал за квадрат; zoom учитывать не надо - всё в экранных px
    const t = 11 * (r.width / pad.current!.offsetWidth)
    apply([hsv[0], clamp(((e.clientX - r.left - t) / (r.width - 2 * t)) * 100), clamp(100 - ((e.clientY - r.top - t) / (r.height - 2 * t)) * 100)])
  }
  const onPadKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2
    const [h, s, v] = hsv
    const moves: Record<string, Hsv> = {
      ArrowLeft: [h, clamp(s - step), v],
      ArrowRight: [h, clamp(s + step), v],
      ArrowUp: [h, s, clamp(v + step)],
      ArrowDown: [h, s, clamp(v - step)],
    }
    if (!moves[e.key]) return
    e.preventDefault()
    apply(moves[e.key])
  }

  const onText = (v: string) => {
    const hex = cleanHex(v)
    setText(hex)
    if (isHex(hex)) {
      own.current = hex
      setHsv(hexToHsv(hex))
      setAccent(hex)
    }
  }

  return (
    <div className="color-editor">
      <div
        ref={pad}
        className="color-pad"
        style={{ '--pad-hue': `hsl(${hsv[0]} 100% 50%)` } as CSSProperties}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
        onKeyDown={onPadKey}
        tabIndex={0}
        role="slider"
        aria-label="Насыщенность и яркость"
        aria-valuetext={`насыщенность ${Math.round(hsv[1])}%, яркость ${Math.round(hsv[2])}%`}
      >
        <span
          className="color-pad-thumb"
          style={{ left: `calc(11px + (100% - 22px) * ${hsv[1] / 100})`, top: `calc(11px + (100% - 22px) * ${1 - hsv[2] / 100})`, background: accent }}
        />
      </div>
      <input
        type="range"
        className="hue-slider"
        min={0}
        max={359}
        value={Math.round(hsv[0])}
        // у серого насыщенности нет, оттенок без неё не виден - добавляем цвета
        onChange={(e) => apply([Number(e.target.value), hsv[1] < 15 ? 80 : hsv[1], hsv[2] < 25 ? 85 : hsv[2]])}
        aria-label="Оттенок"
        style={{ '--thumb-color': `hsl(${hsv[0]} 100% 50%)` } as CSSProperties}
      />
      <label className="color-hex">
        <span className="color-hex-preview" style={{ background: accent }} />
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          // вставленный код заменяет поле целиком, даже если старый не выделили, иначе склеится с ним
          onPaste={(e) => {
            const digits = e.clipboardData.getData('text').replace(/[^0-9a-f]/gi, '')
            if (digits.length !== 6 && digits.length !== 3) return
            e.preventDefault()
            onText(digits.length === 3 ? digits.replace(/./g, '$&$&') : digits)
          }}
          onBlur={() => {
            // короткая запись #fff -> #ffffff, раскрываем только при выходе из поля, чтобы не мешать набору
            if (text.length === 4) onText(text.slice(1).replace(/./g, '$&$&'))
            else setText(accent)
          }}
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
          aria-label="Цвет в формате HEX"
        />
      </label>
    </div>
  )
}
