import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Lottie } from './Lottie'
import { E } from '../data/emoji'

interface ToastItem {
  id: number
  text: string
  emoji: string
}

const Ctx = createContext<(text: string, emoji?: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<number>(0)

  const show = useCallback((text: string, emoji: string = E.check) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, emoji })
    timer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" key={toast.id} role="status">
          <Lottie name={toast.emoji} size={26} />
          <span>{toast.text}</span>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
