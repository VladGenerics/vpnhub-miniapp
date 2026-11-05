// Общая точка наведения для графиков вкладки: навели на день в одном - остальные показывают ту же дату.
// Передаётся время под курсором или null, если курсор ушёл.
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
