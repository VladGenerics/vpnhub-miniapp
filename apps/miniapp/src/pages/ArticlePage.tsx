import { Navigate, useParams } from 'react-router-dom'
import { Page, Hero } from '../components/Page'
import { HELP_ARTICLES, INFO_ARTICLES } from '../data/articles'
import { SupportBlock, type ArticlesKind } from './ArticlesPage'

export function ArticlePage({ kind }: { kind: ArticlesKind }) {
  const { slug } = useParams()
  const article = (kind === 'info' ? INFO_ARTICLES : HELP_ARTICLES).find((a) => a.slug === slug)
  if (!article) return <Navigate to={`/${kind}`} replace />

  return (
    <Page back>
      <Hero emoji={article.emoji} title={article.title} subtitle={article.lead} size={96} />
      <article className="article">
        {article.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
      {kind === 'help' && <SupportBlock />}
    </Page>
  )
}
