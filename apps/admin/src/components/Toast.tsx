import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/* Всплывающие уведомления в правом нижнем углу. */

type Toast = (text: string, kind?: 'success' | 'error') => void
interface Item {
  id: number
  text: string
  kind: 'success' | 'error'
}

const Ctx = createContext<Toast>(() => {})
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const toast = useCallback<Toast>((text, kind = 'success') => {
    const id = ++seq
    setItems((list) => [...list.slice(-2), { id, text, kind }])
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), kind === 'error' ? 5000 : 3000)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'is-error' : ''}`}>
            <Icon name={t.kind === 'error' ? 'close' : 'check'} />
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
