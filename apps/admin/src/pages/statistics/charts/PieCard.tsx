import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Card } from '../../../components/ui'
import { percent } from '../../../lib/format'
import { useResolvedTheme, useSkin } from '../../../lib/theme'
import { echarts, type ECharts } from './echarts'
import { chrome, seriesColor, type Slot } from './palette'
import { useHidden } from './TimeSeriesCard'

export interface PieItem {
  key: string
  name: string
  slot: Slot
  value: number
  /** Дополнительная строка в легенде, например «12 слотов» */
  note?: string
}

/**
 * Доли за выбранный период: кольцо + легенда-таблица со значениями и процентами.
 * Нажатие на строку легенды скрывает долю, проценты пересчитываются по оставшимся.
 */
export function PieCard({
  title,
  sub,
  items,
  format,
  centerLabel,
  fetching,
  className,
}: {
  title: ReactNode
  sub?: ReactNode
  items: PieItem[]
  format(v: number): string
  centerLabel: string
  fetching?: boolean
  className?: string
}) {
  const theme = useResolvedTheme()
  // смена палитры меняет фон и сетку — график перечитывает цвета
  const skin = useSkin()
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  const { hidden, toggle } = useHidden()
  const visible = useMemo(() => items.filter((i) => !hidden.has(i.key) && i.value > 0), [items, hidden])
  const sum = visible.reduce((s, i) => s + i.value, 0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const c = echarts.init(ref.current)
    chart.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    const ch = chrome()
    chart.current?.setOption(
      {
        animationDurationUpdate: 300,
        tooltip: {
          trigger: 'item',
          confine: true,
          backgroundColor: ch.surface,
          borderColor: ch.axis,
          textStyle: {
            color: ch.text,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
          },
          extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);',
          formatter: (p: { name: string; value: number; color: string }) =>
            `<b>${format(p.value)}</b> <span style="color:${ch.hint}">· ${percent(p.value, sum)}</span><div style="color:${ch.hint}">${p.name.replace(/[<>&]/g, '')}</div>`,
        },
        series: [
          {
            type: 'pie',
            radius: ['60%', '92%'],
            avoidLabelOverlap: false,
            label: { show: false },
            labelLine: { show: false },
            // 2 px цвета фона между долями — вместо обводки
            itemStyle: {
              borderColor: ch.surface,
              borderWidth: 2,
              borderRadius: 4,
            },
            emphasis: { scale: true, scaleSize: 4 },
            data: visible.map((i) => ({
              name: i.name,
              value: i.value,
              itemStyle: { color: seriesColor(i.slot, theme) },
            })),
          },
        ],
      },
      { notMerge: true },
    )
  }, [visible, theme, skin, format, sum])

  return (
    <Card className={`chart-card ${className ?? ''}`} title={title} sub={sub}>
      <div className="pie-wrap">
        <div className={`pie ${fetching ? 'is-fetching' : ''}`}>
          <div className="pie-chart">
            <div ref={ref} className="pie-canvas" role="img" aria-label={`${typeof title === 'string' ? title : 'Диаграмма'}: значения перечислены рядом`} />
            <div className="pie-center" aria-hidden>
              <b>{format(sum)}</b>
              <span>{centerLabel}</span>
            </div>
          </div>
          <ul className="pie-legend">
            {items.map((i) => {
              const off = hidden.has(i.key)
              return (
                <li key={i.key}>
                  <button type="button" className={`pie-row ${off ? 'is-off' : ''}`} aria-pressed={!off} onClick={() => toggle(i.key)}>
                    <span className="pie-swatch" style={{ background: seriesColor(i.slot, theme) }} />
                    <span className="pie-name">
                      {i.name}
                      {i.note && <small>{i.note}</small>}
                    </span>
                    <b className="num">{format(i.value)}</b>
                    <span className="pie-share num">{off || !i.value ? '—' : percent(i.value, sum)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Card>
  )
}
