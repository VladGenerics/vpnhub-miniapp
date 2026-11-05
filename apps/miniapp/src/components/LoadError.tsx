import { E } from '../data/emoji'
import { Button } from './Controls'
import { Lottie } from './Lottie'

/** Данные не загрузились: короткое объяснение и повтор, чтобы ошибка не выглядела вечной загрузкой */
export function LoadError({ text = 'Не удалось загрузить данные', onRetry, busy }: { text?: string; onRetry(): void; busy?: boolean }) {
  return (
    <div className="notice load-error" role="alert">
      <Lottie name={E.warning} size={26} />
      <span>{text}</span>
      <Button size="s" variant="secondary" onClick={onRetry} disabled={busy}>
        {busy ? 'Загрузка...' : 'Повторить'}
      </Button>
    </div>
  )
}
