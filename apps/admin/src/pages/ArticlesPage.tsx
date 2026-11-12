import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ARTICLE_KIND_LABEL, type Article, type ArticleKind } from '@vpnhub/shared'
import { useArticles, useDeleteArticle, useReorderArticles, useSaveArticle } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { AppEmoji } from '../components/AppEmoji'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Button, ErrorView, Modal, PageHead, Skeleton } from '../components/ui'

/** Новый порядок: id перемещаемого встаёт на место target */
function moveId(ids: number[], id: number, target: number) {
  const from = ids.indexOf(id)
  const to = ids.indexOf(target)
  if (from < 0 || to < 0 || from === to) return ids
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, id)
  return next
}

// порядок: drag'n'drop или Alt+↑/↓
function KindColumn({ kind, list, onDelete }: { kind: ArticleKind; list: Article[]; onDelete(a: Article): void }) {
  const { canEdit } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveArticle()
  const reorder = useReorderArticles()
  // порядок во время перетаскивания, на сервер уходит после отпускания
  const [dragOrder, setDragOrder] = useState<number[] | null>(null)
  const dragId = useRef<number | null>(null)
  const items = dragOrder ? (dragOrder.map((id) => list.find((a) => a.id === id)).filter(Boolean) as Article[]) : list

  const commit = (ids: number[]) => {
    if (ids.join() === list.map((a) => a.id).join()) return
    reorder.mutate({ kind, ids }, { onError: (e) => toast((e as Error).message, 'error') })
  }

  const drag = (a: Article) =>
    canEdit
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            dragId.current = a.id
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(a.id))
            setDragOrder(list.map((x) => x.id))
          },
          onDragOver: (e: DragEvent) => {
            if (dragId.current === null) return // тащат раздел другой страницы или файл
            e.preventDefault()
            if (a.id !== dragId.current) setDragOrder((o) => o && moveId(o, dragId.current!, a.id))
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault()
            if (dragOrder) commit(dragOrder)
          },
          onDragEnd: () => {
            dragId.current = null
            setDragOrder(null)
          },
        }
      : {}

  const onKey = (e: KeyboardEvent, a: Article, i: number) => {
    if (!canEdit || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const j = i + (e.key === 'ArrowUp' ? -1 : 1)
    if (j < 0 || j >= list.length) return
    commit(
      moveId(
        list.map((x) => x.id),
        a.id,
        list[j].id,
      ),
    )
  }

  const toggle = (a: Article) =>
    save.mutate(
      { id: a.id, input: { is_active: !a.is_active } },
      { onSuccess: () => toast(a.is_active ? 'Скрыт' : 'Показан'), onError: (e) => toast((e as Error).message, 'error') },
    )

  return (
    <section className="card ac">
      <header className="ac-head">
        <h2 className="card-title">{ARTICLE_KIND_LABEL[kind]}</h2>
        <span className="muted">{list.length}</span>
      </header>

      <div className="ac-list" role="list">
        {items.map((a, i) => (
          <div
            key={a.id}
            role="listitem"
            tabIndex={0}
            className={`ac-row lottie-hover ${a.is_active ? '' : 'is-off'} ${dragOrder && a.id === dragId.current ? 'is-dragging' : ''}`}
            onClick={() => navigate(`/articles/${a.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target === e.currentTarget) navigate(`/articles/${a.id}`)
              onKey(e, a, i)
            }}
            {...drag(a)}
          >
            {canEdit && (
              <span className="ac-grip" aria-hidden>
                <Icon name="grip" size={16} />
              </span>
            )}
            <span className="ac-emoji">
              <AppEmoji value={a.emoji} size={36} />
            </span>
            <span className="ac-main">
              <span className="ac-title">
                <Link to={`/articles/${a.id}`} draggable={false} onClick={(e) => e.stopPropagation()}>
                  {a.title}
                </Link>
                {!a.is_active && <span className="badge">Скрыт</span>}
              </span>
              {a.lead && <span className="ac-lead">{a.lead}</span>}
            </span>
            {canEdit && (
              <span className="ac-actions" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={a.is_active ? 'eye' : 'eyeOff'}
                  aria-label={a.is_active ? 'Скрыть' : 'Показать'}
                  title={a.is_active ? 'Скрыть' : 'Показать'}
                  disabled={save.isPending}
                  onClick={() => toggle(a)}
                />
                <Button size="sm" variant="ghost" icon="trash" className="is-danger-ghost" aria-label="Удалить" title="Удалить" onClick={() => onDelete(a)} />
              </span>
            )}
            <Icon name="chevronRight" size={16} className="ac-chevron" />
          </div>
        ))}
      </div>

      {canEdit && (
        <button type="button" className="ac-add" onClick={() => navigate(`/articles/new?kind=${kind}`)}>
          <Icon name="plus" size={16} /> Добавить
        </button>
      )}
    </section>
  )
}

export function ArticlesPage() {
  const { data, error, refetch } = useArticles()
  const remove = useDeleteArticle()
  const toast = useToast()
  const [toDelete, setToDelete] = useState<Article | null>(null)

  const byKind = (kind: ArticleKind) => (data ?? []).filter((a) => a.kind === kind).sort((a, b) => a.sequence_number - b.sequence_number)

  const confirmDelete = () =>
    toDelete &&
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast('Удалено')
        setToDelete(null)
      },
      onError: (e) => toast((e as Error).message, 'error'),
    })

  return (
    <>
      <PageHead title="Разделы" />
      {error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data ? (
        <div className="ac-grid">
          {[0, 1].map((k) => (
            <div className="card ac" key={k}>
              <div className="ac-head">
                <Skeleton width={140} height={20} />
              </div>
              {Array.from({ length: 4 }, (_, i) => (
                <div className="ac-row" key={i}>
                  <Skeleton width={36} height={36} />
                  <Skeleton width="70%" height={16} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="ac-grid">
          <KindColumn kind="INFO" list={byKind('INFO')} onDelete={setToDelete} />
          <KindColumn kind="HELP" list={byKind('HELP')} onDelete={setToDelete} />
          <KindColumn kind="GUIDE" list={byKind('GUIDE')} onDelete={setToDelete} />
        </div>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Удалить раздел?"
        description={toDelete?.title}
        actions={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Отмена
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Удалить
            </Button>
          </>
        }
      />
    </>
  )
}
