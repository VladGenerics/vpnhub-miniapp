export const rub = (n: number) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`

export const date = (d: Date | string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '')

export const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}
