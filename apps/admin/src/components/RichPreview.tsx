import { useMemo, useState, type ReactNode } from 'react'
import { parseRichText, type RichNode } from '@vpnhub/shared'
import { AppEmoji } from './AppEmoji'

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`rp-spoiler ${open ? 'is-open' : ''}`} onClick={() => setOpen(true)}>
      {children}
    </span>
  )
}

function Quote({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <blockquote className={`rp-quote is-expandable ${open ? 'is-open' : ''}`} onClick={() => setOpen((v) => !v)}>
      {children}
    </blockquote>
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
        return <AppEmoji key={k} value={n.id} fallback={n.fallback} size={20} animate inline />
      case 'img':
        return <img key={k} src={n.src} alt={n.alt} loading="lazy" referrerPolicy="no-referrer" />
      case 'gallery':
        return (
          <div key={k} className={`rp-gallery is-${n.mode}`}>
            {render(n.children, `${k}.`)}
          </div>
        )
      case 'anchor':
        return <span key={k}>{render(n.children, `${k}.`)}</span>
      case 'check':
        return (
          <span key={k} className={`rp-check ${n.checked ? 'is-on' : ''}`}>
            {n.checked ? '✓' : ''}
          </span>
        )
      case 'note':
        return (
          <small key={k} className="rp-note">
            {render(n.children, `${k}.`)}
          </small>
        )
      case 'spoiler':
        return <Spoiler key={k}>{render(n.children, `${k}.`)}</Spoiler>
      case 'link':
        return (
          <a key={k} href={n.href} target="_blank" rel="noopener noreferrer" onClick={(e) => n.href.startsWith('/') && e.preventDefault()}>
            {render(n.children, `${k}.`)}
          </a>
        )
      case 'el': {
        const children = render(n.children, `${k}.`)
        if (n.tag === 'blockquote')
          return n.expandable ? (
            <Quote key={k}>{children}</Quote>
          ) : (
            <blockquote key={k} className="rp-quote">
              {children}
            </blockquote>
          )
        if (n.tag === 'th' || n.tag === 'td') {
          const C = n.tag
          return (
            <C key={k} colSpan={n.colSpan} rowSpan={n.rowSpan}>
              {children}
            </C>
          )
        }
        if (n.tag === 'table')
          return (
            <div key={k} className="rp-table">
              <table>{children}</table>
            </div>
          )
        const Tag = n.tag
        return <Tag key={k}>{children}</Tag>
      }
    }
  })
}

/** Превью раздела как в кабинете: анимированный эмодзи пака, заголовок, описание и текст в карточке */
export function ArticlePreview({ emoji, title, lead, body }: { emoji: string; title: string; lead: string; body: string }) {
  const nodes = useMemo(() => parseRichText(body), [body])
  return (
    <div className="rp">
      <div className="rp-hero">
        <div className="rp-hero-emoji">
          <AppEmoji value={emoji} size={88} animate />
        </div>
        <h3>{title}</h3>
        {lead && <p>{lead}</p>}
      </div>
      {nodes.length > 0 && <div className="rp-body">{render(nodes)}</div>}
    </div>
  )
}
