import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера, чтобы вместо пустого экрана показать сообщение
 * и кнопку перезагрузки. Без зависимостей от данных и анимаций — сам упасть не должен.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка интерфейса', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="page crash">
        <div className="crash-icon" aria-hidden>
          !
        </div>
        <h1 className="hero-title">Что-то пошло не так</h1>
        <p className="hero-subtitle">Страница не загрузилась. Попробуйте обновить — данные и подписка не пострадали</p>
        <button className="btn btn-primary btn-l is-stretched" onClick={() => location.reload()}>
          Обновить
        </button>
      </main>
    )
  }
}
