import { Page, Hero } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Button } from '../components/Controls'
import { E } from '../data/emoji'
import { HELP_ARTICLES, INFO_ARTICLES, SUPPORT_URL } from '../data/articles'
import { openSupport } from '../lib/telegram'

const CONFIG = {
  info: {
    emoji: E.bulb,
    title: 'Информация',
    subtitle: 'Здесь ответы на возможные ваши вопросы',
    articles: INFO_ARTICLES,
  },
  help: {
    emoji: E.chat,
    title: 'Помощь',
    subtitle: 'Решения частых проблем и связь с поддержкой',
    articles: HELP_ARTICLES,
  },
}

export type ArticlesKind = keyof typeof CONFIG

export function ArticlesPage({ kind }: { kind: ArticlesKind }) {
  const c = CONFIG[kind]
  return (
    <Page back>
      <Hero emoji={c.emoji} title={c.title} subtitle={c.subtitle} size={128} />
      <Section>
        {c.articles.map((a) => (
          <Cell key={a.slug} to={`/${kind}/${a.slug}`} icon={<Lottie name={a.emoji} size={32} />} title={a.title} subtitle={a.lead} />
        ))}
      </Section>
      {kind === 'help' && <SupportBlock />}
    </Page>
  )
}

export function SupportBlock() {
  return (
    <div className="support-block">
      <Lottie name={E.handshake} size={44} />
      <div className="support-text">
        <div className="cell-title">Не нашли ответ?</div>
        <div className="cell-subtitle">Поддержка отвечает в течение 15 минут</div>
      </div>
      <Button size="m" onClick={() => openSupport(SUPPORT_URL)}>
        Написать
      </Button>
    </div>
  )
}
