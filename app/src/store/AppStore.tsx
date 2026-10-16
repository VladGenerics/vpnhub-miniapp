import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEVICES, PLAN, USER, type Device } from '../data/mock'
import { getTgUser } from '../lib/telegram'
import { applyPalette, initialPalette, type PaletteId } from '../lib/palette'

/* Локальное демо-состояние. Бэкенд позже заменит эти значения. */

interface AutoRenew {
  enabled: boolean
  days: number
}

interface AppState {
  hasSubscription: boolean
  balance: number
  devices: Device[]
  slots: number
  autoRenew: AutoRenew
  email: string | null
  telegramId: number | null
  setHasSubscription(v: boolean): void
  topUp(amount: number): void
  setAutoRenew(v: AutoRenew): void
  releaseSlot(id: string): void
  deleteSlot(id: string): void
  bindEmail(email: string): void
  bindTelegram(): void
  palette: PaletteId
  setPalette(id: PaletteId): void
}

const Ctx = createContext<AppState | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hasSubscription, setHasSubscription] = useState(
    () => new URLSearchParams(location.search).get('sub') !== '0',
  )
  const [balance, setBalance] = useState(USER.balance)
  const [devices, setDevices] = useState(DEVICES)
  const [slots, setSlots] = useState(PLAN.maxSlots)
  const [autoRenew, setAutoRenew] = useState<AutoRenew>({ enabled: true, days: 30 })
  const [email, setEmail] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState<number | null>(() => getTgUser()?.id ?? null)

  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const p = initialPalette()
    applyPalette(p)
    return p
  })
  const setPalette = useCallback((id: PaletteId) => {
    applyPalette(id, true)
    setPaletteState(id)
  }, [])

  const releaseSlot = useCallback((id: string) => setDevices((d) => d.filter((x) => x.id !== id)), [])
  const deleteSlot = useCallback((id: string) => {
    setDevices((d) => d.filter((x) => x.id !== id))
    setSlots((s) => Math.max(1, s - 1))
  }, [])

  const value = useMemo<AppState>(
    () => ({
      hasSubscription,
      balance,
      devices,
      slots,
      autoRenew,
      email,
      telegramId,
      setHasSubscription,
      topUp: (a) => setBalance((b) => b + a),
      setAutoRenew,
      releaseSlot,
      deleteSlot,
      bindEmail: setEmail,
      bindTelegram: () => setTelegramId(5_812_334_097),
      palette,
      setPalette,
    }),
    [hasSubscription, balance, devices, slots, autoRenew, email, telegramId, releaseSlot, deleteSlot, palette, setPalette],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp вне AppStoreProvider')
  return v
}
