import type { ArticleKind } from '@vpnhub/shared'
import { Page, Hero } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { AppEmoji } from '../components/AppEmoji'
import { LoadError } from '../components/LoadError'
import { Button } from '../components/Controls'
import { E } from '../data/emoji'
import { SUPPORT_URL } from '../data/articles'
import { openSupport } from '../lib/telegram'
import { useArticles, useSettings } from '../api/queries'

// шапки страниц постоянные, а сами разделы (эмодзи, заголовок, описание, текст) задаются в админке
const CONFIG = {
  info: {
    kind: 'INFO' as ArticleKind,
    emoji: E.bulb,
    title: 'Информация',
    subtitle: 'Здесь ответы на возможные ваши вопросы',
  },
  help: {
    kind: 'HELP' as ArticleKind,
    emoji: E.chat,
    title: 'Помощь',
    subtitle: 'Решения частых проблем и связь с поддержкой',
  },
}

export type ArticlesKind = keyof typeof CONFIG
export const articleKindOf = (kind: ArticlesKind) => CONFIG[kind].kind

export function ArticlesPage({ kind }: { kind: ArticlesKind }) {
  const c = CONFIG[kind]
  const { data: articles, error, refetch, isFetching } = useArticles(c.kind)
  return (
    <Page back wide returnButton>
      <Hero emoji={c.emoji} title={c.title} subtitle={c.subtitle} size={128} />
      {/* на ПК статьи плиткой в две колонки, на телефоне - обычным списком */}
      {articles ? (
        articles.length > 0 && (
          <div className="article-grid">
            <Section>
              {articles.map((a) => (
                <Cell key={a.id} to={`/${kind}/${a.slug}`} icon={<AppEmoji value={a.emoji} size={32} />} title={a.title} subtitle={a.lead || undefined} />
              ))}
            </Section>
          </div>
        )
      ) : error ? (
        <LoadError text="Не удалось загрузить разделы" onRetry={() => refetch()} busy={isFetching} />
      ) : (
        <div className="section">
          <span className="skeleton is-card" />
        </div>
      )}
      {kind === 'help' && <SupportBlock />}
    </Page>
  )
}

/** «Не нашли ответ?» - блок постоянный, ссылку задаёт админка (Настройки → Ссылка на поддержку) */
export function SupportBlock() {
  // своя ссылка - только запасная, пока настройки не пришли
  const { data: settings } = useSettings()
  return (
    <div className="support-block">
      <Lottie name={E.handshake} size={44} />
      <div className="support-text">
        <div className="cell-title">Не нашли ответ?</div>
        <div className="cell-subtitle">Поддержка отвечает в течение 15 минут</div>
      </div>
      <Button size="m" onClick={() => openSupport(settings?.support_link || SUPPORT_URL) || openSupport(SUPPORT_URL)}>
        Написать
      </Button>
    </div>
  )
}
