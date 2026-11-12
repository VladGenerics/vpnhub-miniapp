import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import type { IconType } from 'react-icons'
import { LuBold, LuCode, LuEyeOff, LuHeading2, LuItalic, LuLink, LuList, LuQuote, LuStrikethrough, LuUnderline } from 'react-icons/lu'

// Поле текста статьи с панелью форматирования. Текст хранится как HTML Telegram (b, i, u, s, a, tg-spoiler,
// code, blockquote) и теги статей (h2, ul/li), панель только расставляет теги вокруг выделения.
// Повторное нажатие снимает тот же тег. Ctrl/Cmd+B, I, U, K - жирный, курсив, подчёркнутый, ссылка

type Wrap = { open: string; close: string; placeholder: string }

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

const TOOLS: { key: string; label: string; Icon: IconType; wrap?: Wrap; hotkey?: string }[] = [
  { key: 'b', label: 'Жирный', Icon: LuBold, wrap: { open: '<b>', close: '</b>', placeholder: 'жирный текст' }, hotkey: 'b' },
  { key: 'i', label: 'Курсив', Icon: LuItalic, wrap: { open: '<i>', close: '</i>', placeholder: 'курсив' }, hotkey: 'i' },
  { key: 'u', label: 'Подчёркнутый', Icon: LuUnderline, wrap: { open: '<u>', close: '</u>', placeholder: 'подчёркнутый' }, hotkey: 'u' },
  { key: 's', label: 'Зачёркнутый', Icon: LuStrikethrough, wrap: { open: '<s>', close: '</s>', placeholder: 'зачёркнутый' } },
  { key: 'link', label: 'Ссылка', Icon: LuLink, hotkey: 'k' },
  { key: 'spoiler', label: 'Спойлер', Icon: LuEyeOff, wrap: { open: '<tg-spoiler>', close: '</tg-spoiler>', placeholder: 'скрытый текст' } },
  { key: 'code', label: 'Код', Icon: LuCode, wrap: { open: '<code>', close: '</code>', placeholder: 'код' } },
  { key: 'quote', label: 'Цитата', Icon: LuQuote, wrap: { open: '<blockquote>', close: '</blockquote>', placeholder: 'цитата' } },
  { key: 'h2', label: 'Заголовок', Icon: LuHeading2, wrap: { open: '<h2>', close: '</h2>', placeholder: 'Заголовок' } },
  { key: 'list', label: 'Список', Icon: LuList },
]

export function RichEditor({ value, onChange, disabled, className }: { value: string; onChange(v: string): void; disabled?: boolean; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // выделение после правки: React перерисовывает поле с новым текстом и сбрасывает курсор в конец,
  // поэтому ставим его заново сразу после отрисовки - так повторное нажатие снимает тот же тег
  const pendingSel = useRef<[number, number] | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !pendingSel.current) return
    el.setSelectionRange(...pendingSel.current)
    pendingSel.current = null
  }, [value])

  /** Заменить выделение и выделить новый текст. execCommand сохраняет Ctrl+Z, без него - запасной путь */
  const replace = (start: number, end: number, text: string, selFrom: number, selTo: number) => {
    const el = ref.current
    if (!el) return
    const current = el.value
    pendingSel.current = [selFrom, selTo]
    el.focus()
    el.setSelectionRange(start, end)
    const ok = document.execCommand?.('insertText', false, text)
    if (!ok) onChange(current.slice(0, start) + text + current.slice(end))
    // если текст не изменился (React не перерисует) - выделяем сразу
    if (el.value === current) {
      el.setSelectionRange(selFrom, selTo)
      pendingSel.current = null
    }
  }

  const wrap = ({ open, close, placeholder }: Wrap) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const value = el.value
    const sel = value.slice(a, b)
    // уже обёрнуто этим тегом (внутри или снаружи выделения) - снимаем
    if (sel.startsWith(open) && sel.endsWith(close) && sel.length >= open.length + close.length) {
      const inner = sel.slice(open.length, sel.length - close.length)
      return replace(a, b, inner, a, a + inner.length)
    }
    if (value.slice(a - open.length, a) === open && value.slice(b, b + close.length) === close) {
      return replace(a - open.length, b + close.length, sel, a - open.length, a - open.length + sel.length)
    }
    const inner = sel || placeholder
    replace(a, b, open + inner + close, a + open.length, a + open.length + inner.length)
  }

  const link = () => {
    const el = ref.current
    if (!el) return
    const url = window.prompt('Адрес ссылки', 'https://')?.trim()
    if (!url || url === 'https://') return
    wrap({ open: `<a href="${url.replace(/"/g, '&quot;')}">`, close: '</a>', placeholder: 'текст ссылки' })
  }

  // строки выделения - пункты списка
  const list = () => {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const lines = (el.value.slice(a, b) || 'пункт').split('\n').filter((l) => l.trim())
    const text = `<ul>\n${lines.map((l) => `  <li>${l.trim()}</li>`).join('\n')}\n</ul>`
    replace(a, b, text, a, a + text.length)
  }

  const run = (key: string) => {
    if (disabled) return
    const tool = TOOLS.find((t) => t.key === key)
    if (key === 'link') link()
    else if (key === 'list') list()
    else if (tool?.wrap) wrap(tool.wrap)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
    const tool = TOOLS.find((t) => t.hotkey === e.key.toLowerCase())
    if (!tool) return
    e.preventDefault()
    run(tool.key)
  }

  return (
    <div className={`rich-editor ${disabled ? 'is-disabled' : ''}`}>
      <div className="rich-toolbar" role="toolbar" aria-label="Форматирование">
        {TOOLS.map(({ key, label, Icon, hotkey }) => (
          <button
            key={key}
            type="button"
            className="rich-tool"
            title={hotkey ? `${label} (${mod}${hotkey.toUpperCase()})` : label}
            aria-label={label}
            disabled={disabled}
            // не забираем фокус у поля, иначе теряется выделение
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(key)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        className={`textarea ${className ?? ''}`}
        value={value}
        disabled={disabled}
        spellCheck
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
