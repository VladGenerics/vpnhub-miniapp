import { Navigate, useParams } from 'react-router-dom'
import { Page, Hero } from '../components/Page'
import { PageError, PageSkeleton } from '../components/States'
import { RichText } from '../components/RichText'
import { useArticles } from '../api/queries'
import { SupportBlock, articleKindOf, type ArticlesKind } from './ArticlesPage'

export function ArticlePage({ kind }: { kind: ArticlesKind }) {
  const { slug } = useParams()
  const { data: articles, isPending, isError, refetch } = useArticles(articleKindOf(kind))

  if (isPending)
    return (
      <Page back returnButton backTo={`/${kind}`}>
        <PageSkeleton />
      </Page>
    )
  if (isError && !articles)
    return (
      <Page back returnButton backTo={`/${kind}`}>
        <PageError onRetry={refetch} />
      </Page>
    )
  const article = articles?.find((a) => a.slug === slug)
  // раздел удалили или выключили в админке - назад к списку
  if (!article) return <Navigate to={`/${kind}`} replace />

  return (
    <Page back returnButton backTo={`/${kind}`}>
      <Hero emoji={article.emoji} title={article.title} subtitle={article.lead || undefined} size={96} />
      <RichText className="article" html={article.body} />
      {kind === 'help' && <SupportBlock />}
    </Page>
  )
}
