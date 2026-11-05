import { useMemo } from 'react'
import { encode } from 'uqr'

// QR-код с логотипом в центре. Модули обычные квадратные: скруглённые «глаза» часть сканеров не читает.
// Коррекция H выдерживает перекрытие до 30 %, логотип занимает ~5 %.

export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const { n, path } = useMemo(() => {
    const { data, size: n } = encode(value, { ecc: 'H', border: 0 })
    // под логотипом модули не рисуем
    const hole = Math.ceil(n * 0.22) | 1
    const h0 = (n - hole) / 2
    const inHole = (x: number, y: number) => x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole
    // один контур на все модули, чтобы не было швов между квадратами
    let path = ''
    data.forEach((row, y) => row.forEach((on, x) => on && !inHole(x, y) && (path += `M${x} ${y}h1v1h-1z`)))
    return { n, path }
  }, [value])

  const logo = n * 0.2
  return (
    <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} width={size} height={size} role="img" aria-label="QR-код ссылки подписки">
      <rect x={-4} y={-4} width={n + 8} height={n + 8} rx={4} fill="#fff" />
      <path d={path} fill="#000" />
      <image href={`${import.meta.env.BASE_URL}favicon.svg`} x={(n - logo) / 2} y={(n - logo) / 2} width={logo} height={logo} />
    </svg>
  )
}
