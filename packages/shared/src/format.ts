export const rub = (n: number) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`

export const date = (d: Date | string) =>
  Number.isNaN(+new Date(d)) ? '—' : new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '')

export const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Точная дата и время в часовом поясе браузера: «24 ноября 2026 в 15:20 (GMT+2)».
 * В БД UTC, API отдаёт ISO со смещением (Z), браузер сам переводит в местное время
 */
export function dateTimeLocal(d: Date | string) {
  const t = new Date(d)
  if (Number.isNaN(+t)) return '—'
  const day = date(t)
  const time = t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const tz = new Intl.DateTimeFormat('ru-RU', { timeZoneName: 'short' }).formatToParts(t).find((p) => p.type === 'timeZoneName')?.value
  return `${day} в ${time}${tz ? ` (${tz})` : ''}`
}

export function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1]
  return forms[2]
}

export const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`
export const devicesWord = (n: number) => plural(n, ['устройство', 'устройства', 'устройств'])

const pad = (n: number) => String(n).padStart(2, '0')

/** Остаток времени в формате «16 дней 13:42:54» */
export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  return d > 0 ? `${days(d)} ${hms}` : hms
}

/** Копирует текст. false - не получилось (старый WebView, запрет браузера): «Скопировано» показывать нельзя */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

/**
 * После релиза старые файлы страниц удаляются, и открытая вкладка не может их подгрузить:
 * вместо экрана ошибки один раз перезагружаемся на новую версию. Повторно в течение минуты
 * не перезагружаем, чтобы при настоящей поломке не уйти в цикл
 */
export function reloadOnStaleChunks() {
  window.addEventListener('vite:preloadError', (e) => {
    const key = 'vpnhub.reloaded-at'
    let last = 0
    try {
      last = Number(sessionStorage.getItem(key)) || 0
      if (Date.now() - last < 60_000) return
      sessionStorage.setItem(key, String(Date.now()))
    } catch {
      return
    }
    e.preventDefault()
    location.reload()
  })
}
