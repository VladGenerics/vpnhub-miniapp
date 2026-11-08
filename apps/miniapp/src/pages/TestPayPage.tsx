import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setTestPayResult } from '../api/mock'
import { Button } from '../components/Controls'
import { Lottie } from '../components/Lottie'
import { E } from '../data/emoji'
import { rub } from '../lib/format'
import { TEST_PAY_EVENT } from '../lib/telegram'

// Заглушка платёжной системы: на неё ведёт pay_url счетов на тестовых данных.
// С настоящим API сюда никто не попадает, страница подключается только при USE_MOCKS.
// onClose - открыта слоем внутри мини-аппа (в Telegram), а не отдельной вкладкой
export function TestPayPage({ url, onClose }: { url?: string; onClose?(): void }) {
  const params = new URL(url ?? location.href).searchParams
  const id = Number(params.get('invoice'))
  const amount = Number(params.get('amount')) || 0
  const [done, setDone] = useState<'PAID' | 'FAILED' | null>(null)

  const finish = (status: 'PAID' | 'FAILED') => {
    setTestPayResult(id, status)
    setDone(status)
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-logo">
          <Lottie name={done === 'PAID' ? E.party : done ? E.warning : E.cardTile} size={88} />
        </div>
        <h1 className="login-title">{done === 'PAID' ? 'Оплачено' : done ? 'Платёж отклонён' : 'Тестовая оплата'}</h1>
        <p className="login-subtitle">
          {done
            ? onClose
              ? 'Возвращайтесь в кабинет: баланс обновится сам'
              : 'Вернитесь в кабинет и нажмите «Проверить оплату»'
            : `Счёт №${id} на ${rub(amount)}. Это заглушка вместо страницы платёжной системы, деньги не списываются`}
        </p>
        {done ? (
          <Button stretched variant={onClose ? 'primary' : 'secondary'} onClick={() => (onClose ? onClose() : window.close())}>
            {onClose ? 'Вернуться в кабинет' : 'Закрыть вкладку'}
          </Button>
        ) : (
          <div className="login-actions">
            <Button stretched onClick={() => finish('PAID')} disabled={!id}>
              Оплатить {rub(amount)}
            </Button>
            <Button stretched variant="secondary" onClick={() => finish('FAILED')} disabled={!id}>
              Отклонить платёж
            </Button>
            {onClose && (
              <Button stretched variant="ghost" onClick={onClose}>
                Отмена
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

/**
 * В Telegram внешняя ссылка открывается в браузере, у которого своё хранилище: итог тестовой оплаты
 * мини-апп там не увидел бы. Поэтому на тестовых данных оплата открывается слоем поверх кабинета
 */
export function TestPayOverlay() {
  const [url, setUrl] = useState<string | null>(null)
  const qc = useQueryClient()
  useEffect(() => {
    const onOpen = (e: Event) => setUrl((e as CustomEvent<string>).detail)
    window.addEventListener(TEST_PAY_EVENT, onOpen)
    return () => window.removeEventListener(TEST_PAY_EVENT, onOpen)
  }, [])
  if (!url) return null
  const close = () => {
    setUrl(null)
    // как после возврата из настоящей платёжки: счета и баланс перечитываются сразу
    qc.invalidateQueries({ queryKey: ['invoice'] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['me'] })
  }
  return (
    <div className="test-pay-layer">
      <TestPayPage key={url} url={url} onClose={close} />
    </div>
  )
}
