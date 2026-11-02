import { PALETTES } from '../lib/palette'
import { haptic } from '../lib/telegram'
import { useApp } from '../store/AppStore'

/** Выбор цветовой палитры (демо-режим) */
export function PalettePicker() {
  const { palette, setPalette } = useApp()
  return (
    <div className="palette-picker" role="radiogroup" aria-label="Цвет оформления">
      {PALETTES.map((p) => (
        <button
          key={p.id}
          role="radio"
          aria-checked={palette === p.id}
          className={`palette-option ${palette === p.id ? 'is-active' : ''}`}
          onClick={() => {
            if (palette === p.id) return
            haptic.select()
            setPalette(p.id)
          }}
        >
          <span className="palette-swatch" style={{ background: p.swatch[0] }}>
            <i style={{ background: p.swatch[1] }} />
          </span>
          <span className="palette-name">{p.title}</span>
        </button>
      ))}
    </div>
  )
}
