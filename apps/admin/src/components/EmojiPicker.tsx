import { useEffect, useRef, useState } from 'react'
import { EMOJI_CATALOG } from '@vpnhub/shared'
import { AppEmoji } from './AppEmoji'
import { Lottie } from './Lottie'

const NAMES = Object.keys(EMOJI_CATALOG)

/** Выбор эмодзи из паков или ручной ввод ID/символа */
export function EmojiField({ id, value, onChange, disabled }: { id: string; value: string; onChange(v: string): void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="emoji-field" ref={box}>
      <button
        type="button"
        className="emoji-field-btn lottie-hover"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Выбрать эмодзи"
        aria-expanded={open}
      >
        <AppEmoji value={value} size={36} />
      </button>
      <div className="emoji-field-main">
        <input id={id} className="input" value={value} disabled={disabled} placeholder="ID" onChange={(e) => onChange(e.target.value.trimStart())} />
      </div>
      {open && (
        <div className="emoji-pop" role="listbox" aria-label="Эмодзи паков">
          {NAMES.map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === value}
              className={`emoji-pop-item lottie-hover ${n === value ? 'is-active' : ''}`}
              title={n}
              onClick={() => {
                onChange(n)
                setOpen(false)
              }}
            >
              <Lottie name={n} size={34} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
