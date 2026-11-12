import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ARTICLE_KIND_LABEL, ARTICLE_LIMITS, slugify, type Article, type ArticleInput, type ArticleKind, type ArticlePatch } from '@vpnhub/shared'
import { useArticles, useSaveArticle } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { EmojiField } from '../components/EmojiPicker'
import { ArticlePreview } from '../components/RichPreview'
import { Segmented } from '../components/Segmented'
import { useToast } from '../components/Toast'
import { Button, Card, ErrorView, Field, PageHead, Skeleton } from '../components/ui'

const KIND_OPTIONS: { value: ArticleKind; label: string }[] = [
  { value: 'INFO', label: ARTICLE_KIND_LABEL.INFO },
  { value: 'HELP', label: ARTICLE_KIND_LABEL.HELP },
  { value: 'GUIDE', label: ARTICLE_KIND_LABEL.GUIDE },
]

type Form = Pick<ArticleInput, 'kind' | 'emoji' | 'title' | 'body'> & { lead: string }

/** Адрес раздела из заголовка; занят - добавляем номер: slots, slots-2 */
function uniqueSlug(title: string, kind: ArticleKind, all: Article[], selfId: number | null) {
  const base = slugify(title) || 'razdel'
  const taken = (s: string) => all.some((a) => a.kind === kind && a.slug === s && a.id !== selfId)
  let slug = base
  for (let i = 2; taken(slug); i++) slug = `${base}-${i}`
  return slug
}

function ArticleForm({ article, all, defaultKind }: { article: Article | null; all: Article[]; defaultKind: ArticleKind }) {
  const { canEdit } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const save = useSaveArticle()
  const initial: Form = article
    ? { kind: article.kind, emoji: article.emoji, title: article.title, lead: article.lead ?? '', body: article.body }
    : { kind: defaultKind, emoji: 'VHubProject_27', title: '', lead: '', body: '' }
  const [v, setV] = useState<Form>(initial)
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof Form>(k: K, val: Form[K]) => setV((p) => ({ ...p, [k]: val }))

  const errors = {
    title: !v.title.trim() ? 'Введите заголовок' : null,
    emoji: !v.emoji.trim() ? 'Выберите эмодзи' : null,
    body: v.body.length > ARTICLE_LIMITS.body ? `Не длиннее ${ARTICLE_LIMITS.body} символов` : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  const changed: ArticlePatch = {}
  for (const k of Object.keys(v) as (keyof Form)[]) if (v[k].trim() !== initial[k].trim()) (changed as Record<string, string>)[k] = v[k].trim()
  const dirty = Object.keys(changed).length > 0

  // уход со страницы с несохранёнными правками - браузер спросит
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors || !dirty) return
    let input: ArticlePatch
    if (article) {
      input = { ...changed }
      if ('lead' in input) input.lead = input.lead || null
      // при переносе на другую страницу адрес может быть занят
      if (input.kind && all.some((a) => a.kind === input.kind && a.slug === article.slug && a.id !== article.id))
        input.slug = uniqueSlug(v.title, input.kind, all, article.id)
    } else {
      input = {
        kind: v.kind,
        emoji: v.emoji.trim(),
        title: v.title.trim(),
        lead: v.lead.trim() || null,
        body: v.body.trim(),
        slug: uniqueSlug(v.title, v.kind, all, null),
        is_active: true,
      }
    }
    save.mutate(
      { id: article?.id ?? null, input },
      {
        onSuccess: () => {
          toast(article ? 'Сохранено' : 'Добавлено')
          navigate('/articles')
        },
        onError: (err) => toast((err as Error).message, 'error'),
      },
    )
  }

  return (
    <form className="ar-edit" onSubmit={submit} noValidate>
      <Card title="Раздел">
        <div className="form ar-form">
          <Field label="Страница">
            {() => <Segmented<ArticleKind> options={KIND_OPTIONS} value={v.kind} onChange={(k) => canEdit && set('kind', k)} label="Страница" />}
          </Field>
          <Field label="Эмодзи" error={show('emoji')}>
            {(id) => <EmojiField id={id} value={v.emoji} onChange={(x) => set('emoji', x)} disabled={!canEdit} />}
          </Field>
          <Field
            label="Заголовок"
            error={show('title')}
            hint={
              v.kind === 'GUIDE'
                ? 'Название платформы: iOS, Android, Windows, macOS или Linux. По нему кнопка в кабинете получает значок и подсветку'
                : undefined
            }
          >
            {(id) => (
              <input
                id={id}
                className={`input ${show('title') ? 'has-error' : ''}`}
                value={v.title}
                maxLength={ARTICLE_LIMITS.title}
                disabled={!canEdit}
                onChange={(e) => set('title', e.target.value)}
              />
            )}
          </Field>
          <Field label="Описание">
            {(id) => (
              <input
                id={id}
                className="input"
                value={v.lead}
                maxLength={ARTICLE_LIMITS.lead}
                disabled={!canEdit}
                onChange={(e) => set('lead', e.target.value)}
              />
            )}
          </Field>
        </div>
      </Card>

      <div className="ar-split">
        <Card title="Текст">
          <div className="field">
            <textarea className="textarea ar-body" value={v.body} disabled={!canEdit} spellCheck onChange={(e) => set('body', e.target.value)} />
            {show('body') && <div className="field-error">{show('body')}</div>}
          </div>
        </Card>
        <Card title="Превью">
          <ArticlePreview emoji={v.emoji} title={v.title} lead={v.lead} body={v.body} />
        </Card>
      </div>

      {canEdit && (
        <div className="form-actions ar-actions">
          <Button type="submit" variant="primary" icon="check" loading={save.isPending} disabled={!dirty}>
            {article ? 'Сохранить' : 'Добавить'}
          </Button>
          <Link to="/articles" className="btn btn-ghost">
            Отмена
          </Link>
        </div>
      )}
    </form>
  )
}

export function ArticleEditPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isNew = id === 'new'
  const { data, error, refetch } = useArticles()
  const article = isNew ? null : (data?.find((a) => a.id === Number(id)) ?? null)
  const kindParam = params.get('kind')
  const defaultKind: ArticleKind = kindParam === 'HELP' || kindParam === 'GUIDE' ? kindParam : 'INFO'

  return (
    <>
      <PageHead title={isNew ? 'Новый раздел' : (article?.title ?? 'Раздел')} />
      {error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data ? (
        <div className="stack">
          <Skeleton height={240} />
          <Skeleton height={320} />
        </div>
      ) : !isNew && !article ? (
        <ErrorView error={{ status: 404 }} />
      ) : (
        <ArticleForm key={article?.id ?? 'new'} article={article} all={data} defaultKind={defaultKind} />
      )}
    </>
  )
}
