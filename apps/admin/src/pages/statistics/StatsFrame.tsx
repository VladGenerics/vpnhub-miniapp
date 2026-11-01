import type { ReactNode } from 'react'
import { ErrorView, Skeleton } from '../../components/ui'
import { PeriodBar } from './PeriodBar'
import type { Period } from './period'
import type { useStatsPeriod } from './period'

type PeriodState = ReturnType<typeof useStatsPeriod>

/** Каркас вкладки: строка периода, состояния загрузки и ошибки, затем содержимое */
export function StatsFrame({
  s,
  error,
  refetch,
  hasData,
  children,
}: {
  s: PeriodState
  error: unknown
  refetch(): void
  hasData: boolean
  children(period: Period): ReactNode
}) {
  if (s.rangeError) return <ErrorView error={s.rangeError} onRetry={() => s.refetchRange()} />
  const ready = s.bounds && s.period

  return (
    <>
      {ready ? (
        <PeriodBar g={s.g} bounds={s.bounds!} period={s.period!} onGranularity={s.setGranularity} onPeriod={s.setPeriod} />
      ) : (
        <div className="stats-head">
          <Skeleton width={260} height={32} />
        </div>
      )}
      {error && !hasData ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : ready && hasData ? (
        children(s.period!)
      ) : (
        <div className="stack">
          <div className="kpi-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="card kpi" key={i}>
                <Skeleton width="50%" />
                <Skeleton width="70%" height={28} />
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <Skeleton height={340} />
          </div>
        </div>
      )}
    </>
  )
}

export const PER: Record<string, string> = { hour: 'по часам', day: 'по дням', month: 'по месяцам', year: 'по годам' }
export const AVG: Record<string, string> = { hour: 'в час', day: 'в день', month: 'в месяц', year: 'в год' }
