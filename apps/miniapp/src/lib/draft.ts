// Незавершённая покупка: что выбрали перед уходом на пополнение.
// Лежит в sessionStorage: после оплаты форма та же, а окно продления или докупки открывается само (resume)

export type Draft =
  | { kind: 'new'; devices: number; days: number; resume?: boolean }
  | { kind: 'renew'; days: number; resume?: boolean }
  | { kind: 'slots'; count: number; resume?: boolean }

const KEY = 'vpnhub.purchase-draft'

export const draft = {
  get(): Draft | null {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null')
    } catch {
      return null
    }
  },
  set(d: Draft) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(d))
    } catch {
      // приватный режим и т. п.: просто не запоминаем
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // нечего чистить
    }
  },
}

/** Черновик нужного вида или null */
export function draftOf<K extends Draft['kind']>(kind: K): Extract<Draft, { kind: K }> | null {
  const d = draft.get()
  return d?.kind === kind ? (d as Extract<Draft, { kind: K }>) : null
}

/** Окно уже открылось по черновику: значения помним, но само больше не открываем */
export function consumeResume(kind: Draft['kind']) {
  const d = draftOf(kind)
  if (d?.resume) draft.set({ ...d, resume: false })
}
