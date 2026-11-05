import { useState } from 'react'
import { setTestPayResult } from '../api/mock'
import { Button } from '../components/Controls'
import { Lottie } from '../components/Lottie'
import { E } from '../data/emoji'
import { rub } from '../lib/format'

// Заглушка платёжной системы: на неё ведёт pay_url счетов на тестовых данных.
// С настоящим API сюда никто не попадает, страница подключается только при USE_MOCKS.
export function TestPayPage() {
  const params = new URLSearchParams(location.search)
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
            ? 'Вернитесь в кабинет и нажмите «Проверить оплату»'
            : `Счёт №${id} на ${rub(amount)}. Это заглушка вместо страницы платёжной системы, деньги не списываются`}
        </p>
        {done ? (
          <Button stretched variant="secondary" onClick={() => window.close()}>
            Закрыть вкладку
          </Button>
        ) : (
          <div className="login-actions">
            <Button stretched onClick={() => finish('PAID')} disabled={!id}>
              Оплатить {rub(amount)}
            </Button>
            <Button stretched variant="secondary" onClick={() => finish('FAILED')} disabled={!id}>
              Отклонить платёж
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
