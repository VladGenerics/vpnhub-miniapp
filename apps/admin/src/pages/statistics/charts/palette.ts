// Цвета графиков: 8 оттенков в фиксированном порядке, различимы при дальтонизме в обеих темах.
// Цвет закреплён за серией: «Боты» всегда одного цвета, даже если часть серий скрыта.

export type Theme = 'light' | 'dark'

const SERIES: Record<Theme, string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

/** Номер слота (1–8) или нейтральный серый — для итоговой линии «Всего» */
export type Slot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'neutral'

export const seriesColor = (slot: Slot, theme: Theme) => (slot === 'neutral' ? (theme === 'dark' ? '#9aa0aa' : '#5b616c') : SERIES[theme][slot - 1])

/** Цвета обвязки графика (фон, сетка, оси, подписи) — из CSS-токенов текущей темы и палитры */
export function chrome() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string) => cs.getPropertyValue(name).trim()
  return {
    surface: v('--surface'),
    grid: v('--hover'),
    axis: v('--border'),
    label: v('--hint'),
    text: v('--text'),
    hint: v('--hint'),
    zoomFill: v('--accent-soft'),
    zoomBg: v('--surface-2'),
  }
}
