import { useEffect, useRef, useState } from 'react'
import { useDebounced } from '../hooks/useDebounced'
import { Icon } from './Icon'

/**
 * Поиск по мере ввода: запрос уходит через 350 мс после последней буквы.
 * value — то, что сейчас в адресе; при «Назад» поле подхватывает его.
 */
export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange(v: string): void; placeholder: string; label: string }) {
  const [text, setText] = useState(value)
  const debounced = useDebounced(text.trim())
  const last = useRef(value)

  useEffect(() => {
    if (debounced !== last.current) {
      last.current = debounced
      onChange(debounced)
    }
  }, [debounced, onChange])

  // адрес поменялся снаружи (навигация назад, сброс фильтров)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(value)
    }
  }, [value])

  return (
    <div className="input-wrap search">
      <Icon name="search" size={16} />
      <input
        className="input"
        type="search"
        inputMode="search"
        value={text}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setText('')}
      />
      {text && (
        <button type="button" className="input-clear" aria-label="Очистить поиск" onClick={() => setText('')}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}
