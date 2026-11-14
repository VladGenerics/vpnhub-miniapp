import { Navigate, useParams } from 'react-router-dom'
import { Page, Hero } from '../components/Page'
import { PageError, PageSkeleton } from '../components/States'
import { RichText } from '../components/RichText'
import { useArticles } from '../api/queries'
import { SupportBlock, articleKindOf, type ArticlesKind } from './ArticlesPage'

export function ArticlePage({ kind }: { kind: ArticlesKind }) {
  const { slug } = useParams()
  const { data: articles, isPending, isError, refetch } = useArticles(articleKindOf(kind))
  // инструкции открываются со страницы подписки - туда и возвращаемся, если истории нет
  const backTo = kind === 'guide' ? '/' : `/${kind}`

  if (isPending)
    return (
      <Page back returnButton backTo={backTo}>
        <PageSkeleton />
      </Page>
    )
  if (isError && !articles)
    return (
      <Page back returnButton backTo={backTo}>
        <PageError onRetry={refetch} />
      </Page>
    )
  const article = articles?.find((a) => a.slug === slug)
  // раздел удалили или выключили в админке - назад к списку
  if (!article) return <Navigate to={backTo} replace />

  return (
    <Page back returnButton backTo={backTo}>
      <Hero emoji={article.emoji} title={article.title} subtitle={article.lead || undefined} size={96} />
      <RichText className="article" html={article.body} />
      {/* в инструкции человек не ищет ответ, а подключается */}
      {kind !== 'info' && <SupportBlock title={kind === 'guide' ? 'Не получается подключиться?' : undefined} />}
    </Page>
  )
}
