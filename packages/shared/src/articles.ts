// Разделы «Информация» и «Помощь»: типы, разделы по умолчанию, разбор HTML и эмодзи.
// Общее для кабинета (показ) и админки (редактор с превью).
import type { ISODate } from './types'
import { EMOJI_CATALOG } from './emojiCatalog'
import { CUSTOM_EMOJI_IDS } from './customEmojiIds'

export type ArticleKind = 'INFO' | 'HELP'

export const ARTICLE_KIND_LABEL: Record<ArticleKind, string> = { INFO: 'Информация', HELP: 'Помощь' }

/** articles: раздел страницы «Информация» или «Помощь» */
export interface Article {
  id: number
  kind: ArticleKind
  /** Часть адреса: /info/<slug>. Латиница, цифры и дефис, уникален внутри kind */
  slug: string
  /** Эмодзи раздела: имя анимированного эмодзи приложения, custom_emoji_id Telegram или обычный символ (см. resolveEmoji) */
  emoji: string
  title: string
  /** Описание под заголовком (в списке и в шапке раздела) */
  lead: string | null
  /** Текст раздела: HTML как в Telegram (parse_mode HTML) и теги статей (см. parseRichText) */
  body: string
  /** Порядок в списке, по возрастанию */
  sequence_number: number
  /** Выключенный раздел не виден пользователям */
  is_active: boolean
  updated_at?: ISODate | null
}

/** POST /admin/articles */
export type ArticleInput = Pick<Article, 'kind' | 'slug' | 'emoji' | 'title' | 'lead' | 'body' | 'is_active'>
/** PATCH /admin/articles/:id */
export type ArticlePatch = Partial<ArticleInput>

export const ARTICLE_LIMITS = { slug: 64, title: 120, lead: 255, body: 20_000 } as const

// --- эмодзи ---

export type ResolvedEmoji = { lottie: string; text?: undefined } | { lottie?: undefined; text: string }

/**
 * Что показать вместо значения эмодзи:
 * - имя анимированного эмодзи приложения (VHubProject_17) - его анимацию;
 * - custom_emoji_id Telegram (только цифры) - анимацию, если ID есть в CUSTOM_EMOJI_IDS, иначе fallback.
 *   Запасной символ можно дописать через пробел: «5368324170671202286 👍»;
 * - всё остальное - как обычный символ (🚀).
 */
export function resolveEmoji(value: string | null | undefined, fallback = ''): ResolvedEmoji {
  const v = (value ?? '').trim()
  if (v in EMOJI_CATALOG) return { lottie: v }
  const id = /^(\d{5,25})(?:\s+(.+))?$/.exec(v)
  if (id) {
    const known = CUSTOM_EMOJI_IDS[id[1]]
    return known ? { lottie: known } : { text: id[2]?.trim() || fallback }
  }
  return { text: v || fallback }
}

/** Обычный символ для значения эмодзи: превью в админке и подписи */
export function emojiChar(value: string | null | undefined, fallback = ''): string {
  const r = resolveEmoji(value, fallback)
  return r.lottie ? (EMOJI_CATALOG[r.lottie] ?? fallback) : (r.text ?? fallback)
}

export const isKnownCustomEmoji = (id: string) => id in CUSTOM_EMOJI_IDS

// --- адрес раздела ---

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/** «Не пришла оплата» -> «ne-prishla-oplata» */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ARTICLE_LIMITS.slug)
}

export const isValidSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= ARTICLE_LIMITS.slug

// --- разбор HTML ---

/** Узел безопасного дерева текста. Всё, чего нет в списке, отбрасывается: скрипты, стили, обработчики, iframe */
export type RichNode =
  | { type: 'text'; text: string }
  | { type: 'br' }
  | { type: 'hr' }
  | { type: 'el'; tag: RichTag; children: RichNode[]; lang?: string; expandable?: boolean; colSpan?: number; rowSpan?: number }
  | { type: 'link'; href: string; children: RichNode[] }
  | { type: 'spoiler'; children: RichNode[] }
  | { type: 'emoji'; id: string | null; fallback: string }
  | { type: 'img'; src: string; alt: string }
  // Rich Messages (Bot API 10.1+): коллаж и слайдшоу фото, якорь, чекбокс списка задач, сноска
  | { type: 'gallery'; mode: 'collage' | 'slideshow'; children: RichNode[] }
  | { type: 'anchor'; name: string; children: RichNode[] }
  | { type: 'check'; checked: boolean }
  | { type: 'note'; children: RichNode[] }

export type RichTag =
  | 'strong'
  | 'em'
  | 'u'
  | 's'
  | 'code'
  | 'pre'
  | 'mark'
  | 'sub'
  | 'sup'
  | 'small'
  | 'p'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'ul'
  | 'ol'
  | 'li'
  | 'blockquote'
  | 'figure'
  | 'figcaption'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td'
  | 'details'
  | 'summary'
  | 'cite'

const TAG_MAP: Record<string, RichTag> = {
  b: 'strong',
  strong: 'strong',
  i: 'em',
  em: 'em',
  u: 'u',
  ins: 'u',
  s: 's',
  strike: 's',
  del: 's',
  code: 'code',
  pre: 'pre',
  mark: 'mark',
  sub: 'sub',
  sup: 'sup',
  small: 'small',
  p: 'p',
  h1: 'h2',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h4',
  h6: 'h4',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  blockquote: 'blockquote',
  aside: 'blockquote',
  figure: 'figure',
  figcaption: 'figcaption',
  table: 'table',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  th: 'th',
  td: 'td',
  details: 'details',
  summary: 'summary',
  cite: 'cite',
}

// выкидываются вместе с содержимым
const DROP = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'head',
  'title',
  'svg',
  'math',
  'form',
  'button',
  'textarea',
  'select',
  'link',
  'meta',
])

// есть разметка статьи (абзацы, заголовки, списки) - переносы строк в тексте не значимы, как в обычном HTML.
// Нет - это текст из Telegram, там перенос строки и есть перенос
const ARTICLE_MARKUP = /<(p|h[1-6]|ul|ol|li|div|figure|table|section|article)\b/i

const MAX_DEPTH = 32

/** Ссылка, которой можно доверять: https/http, tg://, mailto: или адрес внутри приложения (/help/...) */
export function safeHref(raw: string | null): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  // ссылка на якорь в этом же тексте (<a name="x">)
  if (v.startsWith('#')) return /^#[\w-]{1,64}$/.test(v) ? v : null
  // свой адрес: только путь из безопасных символов. Без «//» и «\» - браузер считает «/\evil.com» адресом чужого сайта
  if (v.startsWith('/')) return /^\/(?![/\\])[\w\-./?=&#%~+]*$/.test(v) ? v : null
  try {
    const u = new URL(v)
    return ['https:', 'http:', 'tg:', 'mailto:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}

const customEmojiId = (src: string | null) => /^tg:\/\/emoji\?id=(\d{5,25})$/.exec((src ?? '').trim())?.[1] ?? null

/**
 * Разбирает HTML раздела в безопасное дерево. Понимает:
 * - разметку Telegram (parse_mode HTML): b/strong, i/em, u/ins, s/strike/del, tg-spoiler и span.tg-spoiler, a href,
 *   tg-emoji emoji-id, code, pre с code.language-*, blockquote и blockquote expandable, переносы строк;
 * - разметку статей (как в Telegraph / Instant View): p, h1-h6, ul/ol/li, hr, img, figure/figcaption, aside, таблицы, details;
 * - Rich Messages (Bot API 10.1+): tg-collage, tg-slideshow, tg-reference (сноска), a name (якорь) и ссылки #якорь,
 *   cite, чекбоксы списка задач.
 * Остальные теги убираются, их текст остаётся. Нужен браузер (DOMParser)
 */
export function parseRichText(html: string): RichNode[] {
  const src = (html ?? '').trim()
  if (!src) return []
  const tgMode = !ARTICLE_MARKUP.test(src)
  const doc = new DOMParser().parseFromString(`<body>${src}</body>`, 'text/html')

  const walk = (nodes: NodeListOf<ChildNode> | ChildNode[], depth: number, inPre: boolean): RichNode[] => {
    const out: RichNode[] = []
    for (const n of Array.from(nodes)) {
      if (n.nodeType === 3) {
        let text = n.textContent ?? ''
        // после цитаты и блока кода Telegram не рисует пустую строку: перенос сразу за блоком съедается
        const prev = out[out.length - 1]
        if (tgMode && prev?.type === 'el' && (prev.tag === 'blockquote' || prev.tag === 'pre') && text.startsWith('\n')) text = text.slice(1)
        if (!text) continue
        if (tgMode && !inPre && text.includes('\n')) {
          text.split('\n').forEach((part, i) => {
            if (i) out.push({ type: 'br' })
            if (part) out.push({ type: 'text', text: part })
          })
        } else out.push({ type: 'text', text })
        continue
      }
      if (n.nodeType !== 1) continue
      const el = n as Element
      const name = el.tagName.toLowerCase()
      if (DROP.has(name)) continue
      if (depth > MAX_DEPTH) {
        out.push({ type: 'text', text: el.textContent ?? '' })
        continue
      }
      const kids = () => walk(el.childNodes, depth + 1, inPre || name === 'pre')

      if (name === 'br') out.push({ type: 'br' })
      else if (name === 'hr') out.push({ type: 'hr' })
      else if (name === 'tg-emoji') out.push({ type: 'emoji', id: el.getAttribute('emoji-id'), fallback: el.textContent ?? '' })
      else if (name === 'tg-spoiler' || (name === 'span' && el.classList.contains('tg-spoiler'))) out.push({ type: 'spoiler', children: kids() })
      else if (name === 'tg-collage' || name === 'tg-slideshow')
        out.push({ type: 'gallery', mode: name === 'tg-collage' ? 'collage' : 'slideshow', children: kids() })
      else if (name === 'tg-reference') out.push({ type: 'note', children: kids() })
      else if (name === 'input') {
        // в тексте бывает только чекбокс списка задач, остальные поля ввода выкидываем
        if ((el.getAttribute('type') ?? '').toLowerCase() === 'checkbox') out.push({ type: 'check', checked: el.hasAttribute('checked') })
      } else if (name === 'a') {
        const href = safeHref(el.getAttribute('href'))
        const anchor = el.getAttribute('name') ?? el.getAttribute('id')
        if (href) out.push({ type: 'link', href, children: kids() })
        else if (anchor && /^[\w-]{1,64}$/.test(anchor)) out.push({ type: 'anchor', name: anchor, children: kids() })
        else out.push(...kids())
      } else if (name === 'img') {
        const id = customEmojiId(el.getAttribute('src'))
        if (id) out.push({ type: 'emoji', id, fallback: el.getAttribute('alt') ?? '' })
        else {
          const href = safeHref(el.getAttribute('src'))
          if (href && /^https?:/.test(href)) out.push({ type: 'img', src: href, alt: el.getAttribute('alt') ?? '' })
        }
      } else if (TAG_MAP[name]) {
        const tag = TAG_MAP[name]
        const node: RichNode = { type: 'el', tag, children: kids() }
        if (tag === 'code') {
          const lang = /(?:^|\s)language-([\w+#-]{1,30})/.exec(el.className)?.[1]
          if (lang) node.lang = lang
        }
        if (tag === 'blockquote' && el.hasAttribute('expandable')) node.expandable = true
        if (tag === 'th' || tag === 'td') {
          const cs = Number(el.getAttribute('colspan'))
          const rs = Number(el.getAttribute('rowspan'))
          if (cs > 1 && cs <= 20) node.colSpan = cs
          if (rs > 1 && rs <= 50) node.rowSpan = rs
        }
        out.push(node)
      } else out.push(...kids())
    }
    return out
  }

  return walk(doc.body.childNodes, 0, false)
}

/** Текст без разметки: для поиска, подписей и проверки «пусто ли» */
export function richToText(nodes: RichNode[]): string {
  return nodes
    .map((n) => (n.type === 'text' ? n.text : n.type === 'br' ? '\n' : n.type === 'emoji' ? n.fallback : 'children' in n ? richToText(n.children) : ''))
    .join('')
}

// --- тестовые данные ---

const MOCK_KEY = 'vpnhub.mock-articles'

/**
 * Разделы тестовых бэкендов кабинета и админки: общие через localStorage, правки в админке видны в кабинете,
 * если оба открыты на одном домене (dev: админка на localhost:5173/admin/, прод: ADMIN_BASE_PATH=/admin/)
 */
export const mockArticles = {
  load(): Article[] {
    try {
      const raw = localStorage.getItem(MOCK_KEY)
      if (raw) return JSON.parse(raw) as Article[]
    } catch {
      /* нет хранилища или битые данные - начинаем с разделов по умолчанию */
    }
    return structuredClone(DEFAULT_ARTICLES)
  },
  save(list: Article[]) {
    try {
      localStorage.setItem(MOCK_KEY, JSON.stringify(list))
    } catch {
      /* без хранилища правки живут до перезагрузки */
    }
  },
}

// --- разделы по умолчанию ---

const at = '2026-11-01T00:00:00Z'
let seq = 0
const a = (kind: ArticleKind, slug: string, emoji: string, title: string, lead: string, body: string): Article => ({
  id: ++seq,
  kind,
  slug,
  emoji,
  title,
  lead,
  body,
  sequence_number: seq,
  is_active: true,
  updated_at: at,
})

/** Разделы, пока бэкенд не отдаёт GET /articles. Тексты - прежние из кабинета, абзацы через пустую строку */
export const DEFAULT_ARTICLES: Article[] = [
  a(
    'INFO',
    'about',
    'VHubProject_17',
    'Что такое VPNHub',
    'Коротко о сервисе и о том, как он работает',
    'VPNHub — сервис защищённого доступа в интернет. Подписка даёт персональную ссылку, которую можно добавить в любое совместимое приложение.\n\nОдна подписка покрывает несколько устройств: каждое подключённое устройство занимает слот. Количество слотов зависит от тарифа.',
  ),
  a(
    'INFO',
    'slots',
    'VHubProject_12',
    'Слоты и устройства',
    'Как освободить или удалить слот',
    'Слот занимается автоматически при первом подключении нового устройства по ссылке подписки.\n\n«Освободить слот» отвязывает устройство: оно отключится, а слот можно будет занять другим устройством.\n\n«Удалить слот» уменьшает количество слотов в подписке. Это действие необратимо, сумма автопродления пересчитается.',
  ),
  a(
    'INFO',
    'billing',
    'VHubProject_26',
    'Оплата и баланс',
    'Как считается стоимость подписки',
    'Стоимость подписки считается посуточно: тариф за одно устройство в сутки × количество устройств.\n\nПополнить баланс можно картой, через СБП, звёздами Telegram или криптовалютой. Деньги зачисляются сразу после оплаты.',
  ),
  a(
    'INFO',
    'autorenew',
    'VHubProject_28',
    'Автопродление',
    'Чтобы подписка не закончилась внезапно',
    'При включённом автопродлении подписка продлевается на выбранное количество дней с баланса за сутки до окончания.\n\nСумма списания = стоимость тарифа за устройство в сутки × количество устройств × количество дней.\n\nЕсли на балансе недостаточно средств, мы пришлём уведомление в бот заранее.',
  ),
  a(
    'INFO',
    'privacy',
    'VHubProject_16',
    'Конфиденциальность',
    'Какие данные мы храним',
    'Мы не храним историю посещённых сайтов и содержимое трафика.\n\nДля работы подписки сохраняются только технические данные устройств: платформа, модель и User-Agent приложения.',
  ),
  a(
    'HELP',
    'no-connection',
    'VHubProject_09',
    'VPN не подключается',
    'Проверьте эти пункты по порядку',
    'Убедитесь, что подписка активна и срок не истёк — это видно на главной странице.\n\nОбновите подписку в приложении-клиенте: потяните список серверов вниз или нажмите «Обновить».\n\nЕсли слоты заняты, освободите слот неиспользуемого устройства в разделе «Устройства».',
  ),
  a(
    'HELP',
    'slow',
    'VHubProject_18',
    'Низкая скорость',
    'Что сделать, если интернет медленный',
    'Выберите в клиенте сервер ближе к вашему местоположению.\n\nПопробуйте сменить протокол в настройках приложения-клиента.',
  ),
  a(
    'HELP',
    'payment',
    'VHubProject_22',
    'Не пришла оплата',
    'Деньги списались, а баланс не изменился',
    'Обычно зачисление происходит мгновенно, но иногда платёжный провайдер подтверждает оплату до 15 минут.\n\nЕсли прошло больше времени — напишите в поддержку и приложите чек об оплате.',
  ),
  a(
    'HELP',
    'new-device',
    'VHubProject_12',
    'Как сменить устройство',
    'Перенос подписки на новый телефон или ноутбук',
    'Откройте раздел «Устройства», выберите старое устройство и нажмите «Освободить слот».\n\nДобавьте ссылку подписки в приложение на новом устройстве — оно займёт освободившийся слот.',
  ),
]
