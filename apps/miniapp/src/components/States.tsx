import { E } from '../data/emoji'
import { Button } from './Controls'
import { Lottie } from './Lottie'

/** Заглушка страницы, пока грузятся данные */
export function PageSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Загрузка">
      <span className="skeleton is-circle" />
      <span className="skeleton is-title" />
      <span className="skeleton is-line" />
      <span className="skeleton is-card" />
      <span className="skeleton is-card is-short" />
    </div>
  )
}

/** Ошибка загрузки с повтором */
export function PageError({ onRetry }: { onRetry(): void }) {
  return (
    <div className="hero">
      <Lottie name={E.warning} size={96} />
      <h1 className="hero-title">Не удалось загрузить</h1>
      <p className="hero-subtitle">Проверьте подключение к интернету и попробуйте ещё раз</p>
      <div style={{ marginTop: 20 }}>
        <Button onClick={onRetry}>Повторить</Button>
      </div>
    </div>
  )
}
