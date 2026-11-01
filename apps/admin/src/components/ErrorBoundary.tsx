import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера страницы: вместо белого экрана — сообщение и кнопка перезагрузки.
 * Стоит внутри каркаса, поэтому меню остаётся рабочим и можно уйти в другой раздел.
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
      <div className="state">
        <h2>Что-то пошло не так</h2>
        <p>Раздел не отрисовался. Обновите страницу — если ошибка повторится, пришлите разработчику адрес страницы.</p>
        <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
          Обновить
        </button>
      </div>
    )
  }
}
