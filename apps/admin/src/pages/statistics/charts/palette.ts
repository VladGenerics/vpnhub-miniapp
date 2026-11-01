/*
 * Цвета графиков. Категориальная палитра — 8 оттенков в фиксированном порядке,
 * проверена на различимость при дальтонизме (валидатор палитр, ΔE ≥ 8 для соседних)
 * отдельно для светлой и тёмной темы. Цвет закреплён за сущностью: «Боты» всегда
 * одного цвета, даже если часть серий скрыта.
 */

export type Theme = 'light' | 'dark'

const SERIES: Record<Theme, string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

/** Номер слота (1–8) или нейтральный серый — для итоговой линии «Всего» */
export type Slot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'neutral'

export const seriesColor = (slot: Slot, theme: Theme) => (slot === 'neutral' ? (theme === 'dark' ? '#9aa0aa' : '#5b616c') : SERIES[theme][slot - 1])

export const CHROME = {
  light: { surface: '#ffffff', grid: '#eef0f3', axis: '#dfe2e7', label: '#69707c', text: '#15171b', hint: '#69707c', zoomFill: 'rgba(30,136,229,0.12)', zoomBg: '#f6f7f9' },
  dark: { surface: '#16171a', grid: '#222429', axis: '#2c2e34', label: '#8b919c', text: '#f1f2f4', hint: '#8b919c', zoomFill: 'rgba(43,156,242,0.16)', zoomBg: '#1c1d21' },
} as const

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Цвет подписи на заливке цветом серии: белый или тёмный — что контрастнее */
export function inkOn(hex: string) {
  const l = lum(hex)
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.059 ? '#ffffff' : '#15171b'
}
