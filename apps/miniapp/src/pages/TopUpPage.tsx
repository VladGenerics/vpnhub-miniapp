import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Invoice, PaymentMethod } from '@vpnhub/shared'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Button, Chips } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { PROVIDER_LOOK, TOPUP_PRESETS } from '../data/content'
import { useCreateInvoice, useInvoice, useMe, usePaymentMethods } from '../api/queries'
import { rub } from '../lib/format'
import { haptic, openPayment } from '../lib/telegram'

const MAX = 100_000

/** Окно счёта: ссылка на оплату и ожидание статуса */
function InvoiceSheet({ invoiceId, onClose }: { invoiceId: number | null; onClose(): void }) {
  const { data: inv } = useInvoice(invoiceId)
  const { data: me } = useMe()
  const navigate = useNavigate()

  useEffect(() => {
    if (inv?.status === 'PAID') haptic.notify('success')
    if (inv?.status === 'FAILED' || inv?.status === 'EXPIRED') haptic.notify('error')
  }, [inv?.status])

  const head = (emoji: string, title: string, text: string) => (
    <div className="sheet-head">
      <Lottie name={emoji} size={96} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )

  return (
    <Sheet open={invoiceId !== null} onClose={onClose} expandable={false}>
      {!inv || inv.status === 'UNPAID' ? (
        <>
          {head(E.walletTile, 'Ожидаем оплату', inv?.pay_url ? 'Оплатите счёт на странице платёжной системы — баланс пополнится автоматически' : 'Проверяем статус платежа…')}
          <div className="sheet-actions">
            {inv?.pay_url && (
              <Button stretched onClick={() => openPayment(inv.pay_url!)}>
                Перейти к оплате {rub(inv.amount)}
              </Button>
            )}
            <div className="sheet-wait">
              <span className="spinner" /> Ждём подтверждения платежа
            </div>
          </div>
        </>
      ) : inv.status === 'PAID' ? (
        <>
          {head(E.party, 'Баланс пополнен', `+${rub(inv.amount)} зачислено.${me ? ` Теперь на балансе ${rub(me.balance)}` : ''}`)}
          <div className="sheet-actions">
            <Button stretched onClick={() => navigate('/')}>
              Готово
            </Button>
          </div>
        </>
      ) : (
        <>
          {head(E.warning, inv.status === 'EXPIRED' ? 'Счёт истёк' : 'Оплата не прошла', 'Деньги не списаны. Попробуйте ещё раз или выберите другой способ оплаты')}
          <div className="sheet-actions">
            <Button stretched variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}

export function TopUpPage() {
  const { data: me } = useMe()
  const { data: methods } = usePaymentMethods()
  const create = useCreateInvoice()
  const toast = useToast()
  const [raw, setRaw] = useState('500')
  const [providerId, setProviderId] = useState<number | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  const method: PaymentMethod | undefined = methods?.find((m) => m.id === providerId) ?? methods?.[0]
  const min = method?.min_amount ?? 0
  const amount = Number(raw) || 0
  const error = raw && amount < min ? `Минимальная сумма — ${rub(min)}` : amount > MAX ? `Максимум — ${rub(MAX)}` : ''
  const valid = !!method && amount >= min && amount <= MAX

  const pay = () => {
    if (!method) return
    create.mutate(
      { provider: method.provider, amount },
      {
        // ссылку открывает кнопка в окне счёта: открытие без клика блокируют браузеры и Telegram
        onSuccess: setInvoice,
        onError: () => {
          haptic.notify('error')
          toast('Не удалось создать счёт', E.warning)
        },
      },
    )
  }

  return (
    <Page>
      <header className="balance-hero">
        <Lottie name={E.walletTile} size={64} />
        <div className="balance-label">Текущий баланс</div>
        <div className="balance-value">{me ? <AnimatedNumber value={me.balance} format={rub} from={0} duration={900} /> : '…'}</div>
      </header>

      <Section title="Сумма пополнения" footer={error ? <span className="error">{error}</span> : `От ${rub(min)} до ${rub(MAX)}`}>
        <label className={`amount-input ${error ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={raw}
            style={{ width: `${Math.max(1, raw.length) * 0.62}em` }}
            placeholder="0"
            onChange={(e) => setRaw(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="Сумма пополнения"
          />
          <span>₽</span>
        </label>
        <div className="plan-row is-column">
          <Chips items={TOPUP_PRESETS} value={amount} onChange={(v) => setRaw(String(v))} render={(v) => rub(v)} />
        </div>
      </Section>

      <Section title="Способ оплаты">
        {methods?.map((m) => {
          const look = PROVIDER_LOOK[m.provider]
          return (
            <Cell
              key={m.id}
              icon={<Lottie name={look?.emoji ?? E.cardTile} size={36} />}
              title={m.name}
              subtitle={look?.subtitle}
              after={<span className={`radio ${method?.id === m.id ? 'is-on' : ''}`} />}
              onClick={() => setProviderId(m.id)}
              chevron={false}
            />
          )
        }) ?? <div className="skeleton is-card" />}
      </Section>

      <div className="sticky-cta">
        <Button stretched disabled={!valid || create.isPending} onClick={pay}>
          {create.isPending ? 'Создаём счёт…' : valid ? `Пополнить на ${rub(amount)}` : 'Введите сумму'}
        </Button>
      </div>

      <InvoiceSheet invoiceId={invoice?.id ?? null} onClose={() => setInvoice(null)} />
    </Page>
  )
}
