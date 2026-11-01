import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Granularity } from '@vpnhub/shared'
import { Icon } from '../../../components/Icon'
import { Button, Card } from '../../../components/ui'
import { useResolvedTheme } from '../../../lib/theme'
import { axisNum } from '../../../lib/format'
import { bucketLabel, periodLabel, step, tickLabel, truncate, type Period } from '../period'
import { echarts, type ECharts } from './echarts'
import { CHROME, inkOn, seriesColor, type Slot } from './palette'

export interface Series {
  key: string
  name: string
  slot: Slot
  /** [начало интервала в мс, значение] */
  data: [number, number][]
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Кнопки-переключатели серий под графиком — как в статистике Telegram */
export function LegendPills({
  items,
  hidden,
  onToggle,
  theme,
}: {
  items: { key: string; name: string; slot: Slot; note?: string }[]
  hidden: Set<string>
  onToggle(key: string): void
  theme: 'light' | 'dark'
}) {
  const visible = items.length - items.filter((i) => hidden.has(i.key)).length
  return (
    <div className="legend" role="group" aria-label="Показать или скрыть серии">
      {items.map((s) => {
        const c = seriesColor(s.slot, theme)
        const off = hidden.has(s.key)
        // последнюю видимую серию не выключаем — пустой график ничего не объясняет
        const lock = !off && visible === 1
        return (
          <button
            key={s.key}
            type="button"
            className={`legend-pill ${off ? 'is-off' : ''}`}
            style={{ ['--c' as string]: c, ['--ink' as string]: inkOn(c) }}
            aria-pressed={!off}
            disabled={lock}
            title={lock ? 'Хотя бы одна серия должна остаться' : undefined}
            onClick={() => onToggle(s.key)}
          >
            <Icon name="check" size={14} />
            {s.name}
            {s.note && <span className="legend-note">{s.note}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function useHidden() {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const toggle = (k: string) =>
    setHidden((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  return { hidden, toggle }
}

/**
 * График временного ряда с ползунком периода внизу.
 * Ползунок двигает общий период вкладки — вместе с ним меняются метрики, круговые диаграммы
 * и остальные графики. Пока данные перезагружаются, остаётся прошлый кадр с прозрачностью.
 */
export function TimeSeriesCard({
  title,
  sub,
  type,
  stacked,
  cumulative,
  series,
  g,
  bounds,
  period,
  onPeriod,
  format,
  axisFormat = axisNum,
  total,
  fetching,
  height = 340,
  className,
  right,
}: {
  title: ReactNode
  sub?: ReactNode
  type: 'line' | 'area' | 'bar'
  stacked?: boolean
  /** Накопительный ряд: ось Y не от нуля, чтобы был виден рост */
  cumulative?: boolean
  series: Series[]
  g: Granularity
  bounds: Period
  period: Period
  onPeriod(p: Period): void
  format(v: number): string
  axisFormat?(v: number): string
  /** Показать строку «Всего» в подсказке (для столбцов друг на друге) */
  total?: string
  fetching?: boolean
  height?: number
  className?: string
  right?: ReactNode
}) {
  const theme = useResolvedTheme()
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  const { hidden, toggle } = useHidden()
  const [asTable, setAsTable] = useState(false)
  const visible = useMemo(() => series.filter((s) => !hidden.has(s.key)), [series, hidden])

  // актуальные значения для обработчиков событий графика
  const live = useRef({ period, onPeriod, g })
  live.current = { period, onPeriod, g }
  /** Период, который график показывает сейчас — чтобы не применять его повторно */
  const shown = useRef<Period | null>(null)

  const zoomWindow = (p: Period) => ({ startValue: p.from, endValue: truncate(p.to - 1, g) })

  /**
   * Последний интервал ещё идёт (сегодня, текущий месяц) — его значение неполное.
   * Такой отрезок рисуем пунктиром, столбец — бледнее, иначе кажется, что всё упало.
   * Накопительных рядов это не касается: там последняя точка — текущее значение.
   */
  const partial = !cumulative && bounds.to > Date.now() ? truncate(bounds.to - 1, g) : null

  /** Зазор между частями столбца — только если столбцы достаточно широкие, иначе он съедает узкие столбцы */
  const gapWidth = (p: Period) => {
    const c = chart.current
    if (!c || type !== 'bar' || !stacked) return 0
    let n = 0
    for (let t = p.from; t < p.to && n < 2000; t = step(t, g)) n++
    return c.getWidth() / Math.max(1, n) > 14 ? 1 : 0
  }

  /* создание графика и реакция на размер */
  useLayoutEffect(() => {
    if (!ref.current || asTable) return
    const c = echarts.init(ref.current, null, { renderer: 'canvas' })
    chart.current = c
    let raf = 0
    c.on('datazoom', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const dz = (c.getOption() as { dataZoom?: { startValue?: number; endValue?: number }[] }).dataZoom?.[0]
        if (dz?.startValue === undefined || dz.endValue === undefined) return
        const { g: gg, onPeriod: cb } = live.current
        const p = { from: truncate(dz.startValue, gg), to: step(truncate(dz.endValue, gg), gg) }
        shown.current = p
        cb(p)
      })
    })
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(ref.current)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [asTable])

  /* данные, тема, набор серий — полная перерисовка */
  useEffect(() => {
    const c = chart.current
    if (!c) return
    const ch = CHROME[theme]
    const p = live.current.period
    const bar = type === 'bar'
    const lastVisible = visible.length - 1
    c.setOption(
      {
        animationDuration: 300,
        animationDurationUpdate: 250,
        grid: { left: 4, right: 12, top: 14, bottom: 64, containLabel: true },
        xAxis: {
          type: 'time',
          min: bounds.from,
          max: truncate(bounds.to - 1, g),
          axisLine: { lineStyle: { color: ch.axis } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: ch.label, hideOverlap: true, formatter: (v: number) => tickLabel(v, g) },
        },
        yAxis: {
          type: 'value',
          // накопительные ряды — не от нуля, чтобы был виден рост; остальное — от нуля
          scale: !!cumulative && !bar,
          splitNumber: 4,
          splitLine: { lineStyle: { color: ch.grid } },
          axisLabel: { color: ch.label, formatter: (v: number) => axisFormat(v) },
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: ch.surface,
          borderColor: ch.axis,
          borderWidth: 1,
          padding: [10, 12],
          textStyle: { color: ch.text, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 },
          extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);',
          axisPointer: bar ? { type: 'shadow', shadowStyle: { color: ch.zoomFill } } : { type: 'line', lineStyle: { color: ch.axis, width: 1 } },
          formatter: (all: { axisValue: number; seriesName: string; value: [number, number | string]; color: string }[]) => {
            // у ряда с пунктирным хвостом две серии с одним именем — берём ту, где есть значение
            const seen = new Set<string>()
            const params = all.filter(
              (pr): pr is (typeof all)[number] & { value: [number, number] } =>
                typeof pr.value[1] === 'number' && !seen.has(pr.seriesName) && !!seen.add(pr.seriesName),
            )
            if (!params.length) return ''
            const t = params[0].axisValue
            const note = t === partial ? ` · <span style="font-style:italic">неполный, ещё идёт</span>` : ''
            const head = `<div style="color:${ch.hint};margin-bottom:6px">${esc(bucketLabel(t, g))}${note}</div>`
            const rows = params
              .map(
                (pr) =>
                  `<div style="display:flex;align-items:center;gap:8px;line-height:1.7"><span style="width:12px;height:3px;border-radius:2px;background:${pr.color}"></span><b style="font-variant-numeric:tabular-nums">${esc(format(pr.value[1]))}</b><span style="color:${ch.hint}">${esc(pr.seriesName)}</span></div>`,
              )
              .join('')
            const sum = total && params.length > 1 ? `<div style="border-top:1px solid ${ch.axis};margin-top:6px;padding-top:6px"><b>${esc(format(params.reduce((s, pr) => s + pr.value[1], 0)))}</b> <span style="color:${ch.hint}">${esc(total)}</span></div>` : ''
            return head + rows + sum
          },
        },
        dataZoom: [
          {
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'filter',
            ...zoomWindow(p),
            height: 34,
            bottom: 8,
            left: 8,
            right: 14,
            showDetail: false,
            brushSelect: false,
            borderColor: ch.axis,
            backgroundColor: ch.zoomBg,
            fillerColor: ch.zoomFill,
            borderRadius: 8,
            handleSize: '70%',
            handleStyle: { color: ch.surface, borderColor: ch.label },
            moveHandleSize: 5,
            moveHandleStyle: { color: ch.axis },
            emphasis: { handleStyle: { borderColor: ch.text }, moveHandleStyle: { color: ch.label } },
            dataBackground: { lineStyle: { color: ch.label, opacity: 0.5 }, areaStyle: { color: ch.label, opacity: 0.08 } },
            selectedDataBackground: { lineStyle: { color: ch.label }, areaStyle: { color: ch.label, opacity: 0.16 } },
            labelFormatter: '',
          },
        ],
        series: visible.flatMap((s, i) => {
          const color = seriesColor(s.slot, theme)
          const hasPartial = partial !== null && s.data.at(-1)?.[0] === partial
          if (bar)
            return {
              type: 'bar',
              name: s.name,
              data: hasPartial ? s.data.map((d) => (d[0] === partial ? { value: d, itemStyle: { opacity: 0.45 } } : d)) : s.data,
              stack: stacked ? 'total' : undefined,
              barMaxWidth: 24,
              barCategoryGap: '30%',
              itemStyle: {
                color,
                // скругление 4 px — только у верхнего края столбца; зазор между частями — цветом фона
                borderRadius: !stacked || i === lastVisible ? [4, 4, 0, 0] : 0,
                borderColor: ch.surface,
                borderWidth: gapWidth(p),
              },
              emphasis: { itemStyle: { opacity: 0.85 } },
            }
          const line = {
            type: 'line' as const,
            name: s.name,
            data: s.data as [number, number | '-'][],
            stack: stacked ? 'total' : undefined,
            showSymbol: false,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { width: 2, color, cap: 'round' as const, join: 'round' as const },
            itemStyle: { color, borderColor: ch.surface, borderWidth: 2 },
            areaStyle: type === 'area' ? { color, opacity: 0.1 } : undefined,
            emphasis: { focus: 'none' as const, scale: false },
          }
          // у сложенных линий хвост отдельной серией не нарисовать — оставляем как есть
          if (!hasPartial || stacked || s.data.length < 2) return line
          return [
            { ...line, data: s.data.map(([t, v]) => [t, t === partial ? '-' : v] as [number, number | '-']) },
            { ...line, data: s.data.slice(-2), lineStyle: { ...line.lineStyle, type: [4, 4] } },
          ]
        }),
      },
      { notMerge: true },
    )
    shown.current = p
  }, [visible, theme, type, stacked, cumulative, g, bounds, partial, format, axisFormat, total, asTable])

  /* период поменяли снаружи (пресет, даты, соседний график) — сдвигаем окно */
  useEffect(() => {
    const c = chart.current
    if (!c) return
    const s = shown.current
    if (s && s.from === period.from && s.to === period.to) return
    shown.current = period
    c.setOption({ dataZoom: [zoomWindow(period)] })
  }, [period, g])

  /* ширина зазора между частями столбцов зависит от того, сколько столбцов на экране */
  useEffect(() => {
    const c = chart.current
    if (!c || type !== 'bar' || !stacked) return
    const w = gapWidth(period)
    c.setOption({ series: visible.map(() => ({ itemStyle: { borderWidth: w } })) })
  }, [period, visible, type, stacked])

  const tableRows = useMemo(() => {
    if (!asTable) return []
    const byT = new Map<number, number[]>()
    visible.forEach((s, i) =>
      s.data.forEach(([t, v]) => {
        if (t < period.from || t >= period.to) return
        const row = byT.get(t) ?? Array(visible.length).fill(0)
        row[i] = v
        byT.set(t, row)
      }),
    )
    return [...byT.entries()].sort((a, b) => b[0] - a[0])
  }, [asTable, visible, period])

  return (
    <Card
      className={`chart-card ${className ?? ''}`}
      title={title}
      sub={sub ?? <span className="chart-range">{periodLabel(period, g)}</span>}
      right={
        <>
          {right}
          <Button
            variant="ghost"
            size="sm"
            icon={asTable ? 'chart' : 'receipt'}
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
            title={asTable ? 'Показать график' : 'Показать таблицей'}
          >
            {asTable ? 'График' : 'Таблица'}
          </Button>
        </>
      }
      flush
    >
      {asTable ? (
        <div className="chart-table" style={{ maxHeight: height }}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Период</th>
                {visible.map((s) => (
                  <th key={s.key} scope="col" className="is-num">
                    {s.name}
                  </th>
                ))}
                {total && visible.length > 1 && (
                  <th scope="col" className="is-num">
                    {total}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(([t, vals]) => (
                <tr key={t}>
                  <td>
                    {bucketLabel(t, g)}
                    {t === partial && <span className="muted"> · неполный</span>}
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} className="is-num">
                      {format(v)}
                    </td>
                  ))}
                  {total && visible.length > 1 && <td className="is-num">{format(vals.reduce((a, b) => a + b, 0))}</td>}
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={visible.length + 2} className="table-empty">
                    За период данных нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className={`chart ${fetching ? 'is-fetching' : ''}`} style={{ height }} role="img" aria-label={`График: ${typeof title === 'string' ? title : ''}. Значения доступны в виде таблицы`} />
      )}
      {series.length > 1 && <LegendPills items={series} hidden={hidden} onToggle={toggle} theme={theme} />}
      {series.length <= 1 && <div style={{ height: 12 }} />}
    </Card>
  )
}
