/**
 * Общая точка наведения для графиков вкладки статистики: навели на день в одном графике —
 * остальные показывают подсказку за ту же дату. Шлётся время под курсором (или null — курсор ушёл).
 */
type Listener = (source: object, t: number | null) => void

const listeners = new Set<Listener>()

export const hoverSync = {
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => void listeners.delete(fn)
  },
  emit(source: object, t: number | null) {
    listeners.forEach((fn) => fn(source, t))
  },
}
