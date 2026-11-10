import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { parseRichText, type RichNode } from '@vpnhub/shared'
import { AppEmoji } from './AppEmoji'
import { haptic, openSupport } from '../lib/telegram'

/** Скрытый текст (tg-spoiler): размыт, пока не нажмут */
function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className={`rich-spoiler ${open ? 'is-open' : ''}`}
      role={open ? undefined : 'button'}
      tabIndex={open ? undefined : 0}
      aria-label={open ? undefined : 'Показать скрытый текст'}
      onClick={() => {
        if (!open) haptic.select()
        setOpen(true)
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}
    >
      {children}
    </span>
  )
}

/** Сворачиваемая цитата (blockquote expandable): первые строки и раскрытие по нажатию */
function ExpandableQuote({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <blockquote
      className={`rich-quote is-expandable ${open ? 'is-open' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => {
        haptic.select()
        setOpen((v) => !v)
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((v) => !v))}
    >
      {children}
    </blockquote>
  )
}

function RichLink({ href, children }: { href: string; children: ReactNode }) {
  // якорь в тексте
  if (href.startsWith('#'))
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault()
          document.getElementById(`rich-${href.slice(1)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      >
        {children}
      </a>
    )
  // адрес внутри приложения - переход без перезагрузки
  if (href.startsWith('/'))
    return (
      <Link to={href} state={{ back: true }} onClick={() => haptic.tap()}>
        {children}
      </Link>
    )
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // в Telegram открываем через WebApp
        if (/^(https?:|tg:)/.test(href) && openSupport(href)) e.preventDefault()
      }}
    >
      {children}
    </a>
  )
}

function render(nodes: RichNode[], key = ''): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}${i}`
    switch (n.type) {
      case 'text':
        return n.text
      case 'br':
        return <br key={k} />
      case 'hr':
        return <hr key={k} />
      case 'emoji':
        return <AppEmoji key={k} value={n.id} fallback={n.fallback} size={20} inline />
      case 'img':
        return <img key={k} src={n.src} alt={n.alt} loading="lazy" referrerPolicy="no-referrer" />
      case 'spoiler':
        return <Spoiler key={k}>{render(n.children, `${k}.`)}</Spoiler>
      case 'gallery':
        return (
          <div key={k} className={`rich-gallery is-${n.mode}`}>
            {render(n.children, `${k}.`)}
          </div>
        )
      case 'anchor':
        return (
          <span key={k} id={`rich-${n.name}`} className="rich-anchor">
            {render(n.children, `${k}.`)}
          </span>
        )
      case 'check':
        return (
          <span key={k} className={`rich-check ${n.checked ? 'is-on' : ''}`} role="img" aria-label={n.checked ? 'Выполнено' : 'Не выполнено'}>
            {n.checked ? '✓' : ''}
          </span>
        )
      case 'note':
        return (
          <small key={k} className="rich-note">
            {render(n.children, `${k}.`)}
          </small>
        )
      case 'link':
        return (
          <RichLink key={k} href={n.href}>
            {render(n.children, `${k}.`)}
          </RichLink>
        )
      case 'el': {
        const children = render(n.children, `${k}.`)
        if (n.tag === 'blockquote')
          return n.expandable ? (
            <ExpandableQuote key={k}>{children}</ExpandableQuote>
          ) : (
            <blockquote key={k} className="rich-quote">
              {children}
            </blockquote>
          )
        if (n.tag === 'code')
          return (
            <code key={k} data-lang={n.lang}>
              {children}
            </code>
          )
        if (n.tag === 'th' || n.tag === 'td') {
          const Cell = n.tag
          return (
            <Cell key={k} colSpan={n.colSpan} rowSpan={n.rowSpan}>
              {children}
            </Cell>
          )
        }
        // таблица в своей прокрутке, чтобы широкая не ломала страницу
        if (n.tag === 'table')
          return (
            <div key={k} className="rich-table">
              <table>{children}</table>
            </div>
          )
        const Tag = n.tag
        return <Tag key={k}>{children}</Tag>
      }
    }
  })
}

/** Текст раздела: HTML через parseRichText, без dangerouslySetInnerHTML */
export function RichText({ html, className }: { html: string; className?: string }) {
  const nodes = useMemo(() => parseRichText(html), [html])
  return <div className={`rich ${className ?? ''}`}>{render(nodes)}</div>
}
