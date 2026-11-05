import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Invoice, PaymentMethod } from '@vpnhub/shared'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Page } from '../components/Page'
import { Section, Cell, Chevron } from '../components/List'
import { Lottie } from '../components/Lottie'
import { LoadError } from '../components/LoadError'
import { Button, Chips } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { PROVIDER_LOOK, TOPUP_PRESETS } from '../data/content'
import { useCreateInvoice, useInvoice, useMe, usePaymentMethods, useUnpaidInvoices } from '../api/queries'
import { rub } from '../lib/format'
import { haptic, isTelegram, openPayment } from '../lib/telegram'

const MAX = 100_000

/** Ссылка на оплату. В Telegram открываем его средствами, в браузере - обычная ссылка в новой вкладке */
function PayLink({ url, className, children }: { url: string; className: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        haptic.tap()
        if (!isTelegram) return
        e.preventDefault()
        openPayment(url)
      }}
    >
      {children}
    </a>
  )
}

/** Окно счёта: ссылка на оплату, ручная проверка и ожидание статуса */
function InvoiceSheet({ invoiceId, onClose }: { invoiceId: number | null; onClose(): void }) {
  const { data: inv, refetch, isFetching, error } = useInvoice(invoiceId)
  const { data: me } = useMe()
  const toast = useToast()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (inv?.status === 'PAID') haptic.notify('success')
    if (inv?.status === 'FAILED' || inv?.status === 'EXPIRED') haptic.notify('error')
  }, [inv?.status])

  const check = async () => {
    setChecking(true)
    const { data, error } = await refetch()
    setChecking(false)
    if (error) toast('Не удалось проверить, попробуйте ещё раз', E.warning)
    else if (data?.status === 'UNPAID') toast('Оплата пока не поступила', E.bell)
  }

  const head = (emoji: string, title: string, text: string) => (
    <div className="sheet-head">
      <Lottie name={emoji} size={96} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )

  return (
    <Sheet open={invoiceId !== null} onClose={onClose} expandable={false}>
      {!inv && error ? (
        <>
          {head(
            E.warning,
            'Не удалось загрузить счёт',
            'Проверьте соединение. Если вы уже оплатили, деньги не пропадут: баланс пополнится, когда платёж дойдёт',
          )}
          <div className="sheet-actions">
            <Button stretched onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Загрузка...' : 'Повторить'}
            </Button>
            <Button stretched variant="ghost" onClick={onClose}>
              Вернуться
            </Button>
          </div>
        </>
      ) : !inv || inv.status === 'UNPAID' ? (
        <>
          {head(
            E.walletTile,
            inv ? `Счёт на ${rub(inv.amount)}` : 'Счёт',
            inv?.pay_url ? 'Оплатите счёт на странице платёжной системы. Баланс пополнится сам, или нажмите «Проверить оплату»' : 'Готовим ссылку на оплату...',
          )}
          <div className="sheet-actions">
            {inv?.pay_url ? (
              <PayLink url={inv.pay_url} className="btn btn-primary btn-l is-stretched">
                Перейти к оплате
              </PayLink>
            ) : (
              <Button stretched disabled>
                <span className="spinner" /> Готовим ссылку
              </Button>
            )}
            <Button stretched variant="secondary" onClick={check} disabled={!inv || checking}>
              {checking || (isFetching && !inv) ? 'Проверяем...' : 'Проверить оплату'}
            </Button>
            <Button stretched variant="ghost" onClick={onClose}>
              Вернуться
            </Button>
          </div>
        </>
      ) : inv.status === 'PAID' ? (
        <>
          {head(E.party, 'Баланс пополнен', `+${rub(inv.amount)} зачислено.${me ? ` Теперь на балансе ${rub(me.balance)}` : ''}`)}
          <div className="sheet-actions">
            <Button stretched onClick={onClose}>
              Готово
            </Button>
          </div>
        </>
      ) : (
        <>
          {head(
            E.warning,
            inv.status === 'EXPIRED' ? 'Счёт истёк' : 'Оплата не прошла',
            'Деньги не списаны. Попробуйте ещё раз или выберите другой способ оплаты',
          )}
          <div className="sheet-actions">
            <Button stretched variant="secondary" onClick={onClose}>
              Вернуться
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}

/** «сегодня, 15:20» или «3 нояб., 15:20» */
function shortTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const day = d.toDateString() === new Date().toDateString() ? 'сегодня' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return `${day}, ${time}`
}

// сколько счетов видно сразу, остальные - по кнопке «Показать ещё»
const UNPAID_VISIBLE = 3

/** Неоплаченные счета: нажатие ведёт на pay_url */
function UnpaidInvoices({ methods }: { methods?: PaymentMethod[] }) {
  const { data: list } = useUnpaidInvoices()
  const [expanded, setExpanded] = useState(false)
  if (!list?.length) return null
  const hidden = list.length - UNPAID_VISIBLE
  const shown = expanded || hidden <= 0 ? list : list.slice(0, UNPAID_VISIBLE)
  const name = (inv: Invoice) => methods?.find((m) => m.provider === inv.provider)?.name ?? inv.provider
  return (
    <Section title="Неоплаченные счета" footer="Нажмите на счёт, чтобы перейти к оплате">
      {shown.map((inv) => {
        const inner = (
          <>
            <div className="cell-icon">
              <Lottie name={PROVIDER_LOOK[inv.provider]?.emoji ?? E.cardTile} size={36} />
            </div>
            <div className="cell-main">
              <div className="cell-title">{rub(inv.amount)}</div>
              <div className="cell-subtitle">
                {shortTime(inv.created_at)} · {name(inv)}
              </div>
            </div>
            <div className="cell-after">
              <span className="invoice-pay">Оплатить</span>
            </div>
            {inv.pay_url && <Chevron />}
          </>
        )
        return inv.pay_url ? (
          <PayLink key={inv.id} url={inv.pay_url} className="cell tone-default is-interactive">
            {inner}
          </PayLink>
        ) : (
          <div key={inv.id} className="cell tone-default">
            {inner}
          </div>
        )
      })}
      {hidden > 0 && (
        <Cell
          tone="accent"
          title={expanded ? 'Свернуть' : `Показать ещё ${hidden}`}
          onClick={() => {
            haptic.select()
            setExpanded((v) => !v)
          }}
          chevron={false}
        />
      )}
    </Section>
  )
}

/** Сумма из ссылки (?amount=300 - «Пополнить на 300 ₽» из окна покупки), иначе 500 */
function initialAmount(v: string | null) {
  const n = Math.ceil(Number(v))
  return n > 0 && n <= MAX ? String(n) : '500'
}

export function TopUpPage() {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: methods, error: methodsError, refetch: refetchMethods, isFetching: methodsFetching } = usePaymentMethods()
  const create = useCreateInvoice()
  const toast = useToast()
  const [sp] = useSearchParams()
  const [raw, setRaw] = useState(() => initialAmount(sp.get('amount')))
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
        // ссылку открывает кнопка в окне счёта: без клика браузеры и Telegram её блокируют
        onSuccess: setInvoice,
        onError: (e) => {
          haptic.notify('error')
          // например лимит неоплаченных счетов: текст приходит из detail бэкенда
          toast(e.message || 'Не удалось создать счёт', E.warning)
        },
      },
    )
  }

  return (
    <Page>
      <header className="balance-hero">
        <Lottie name={E.walletTile} size={64} />
        <div className="balance-label">Текущий баланс</div>
        <div className="balance-value">{me ? <AnimatedNumber value={me.balance} format={rub} from={0} duration={900} /> : meError ? '—' : '...'}</div>
      </header>
      {meError && !me && <LoadError text="Не удалось загрузить баланс" onRetry={() => refetchMe()} busy={meFetching} />}

      <Section title="Сумма пополнения" footer={error ? <span className="error">{error}</span> : `От ${rub(min)} до ${rub(MAX)}`}>
        <label className={`amount-input ${error ? 'has-error' : ''}`}>
          {/* ширину поля задаёт невидимая копия текста: так оно ровно по цифрам в любом шрифте */}
          <span className="amount-field">
            <span className="amount-mirror" aria-hidden>
              {raw || '0'}
            </span>
            <input
              inputMode="numeric"
              value={raw}
              placeholder="0"
              onChange={(e) => setRaw(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-label="Сумма пополнения"
            />
          </span>
          <span>₽</span>
        </label>
        <div className="plan-row is-column">
          <Chips items={TOPUP_PRESETS} value={amount} onChange={(v) => setRaw(String(v))} render={(v) => rub(v)} />
        </div>
      </Section>

      <UnpaidInvoices methods={methods} />

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
        }) ?? (methodsError ? null : <div className="skeleton is-card" />)}
      </Section>
      {methodsError && !methods && <LoadError text="Не удалось загрузить способы оплаты" onRetry={() => refetchMethods()} busy={methodsFetching} />}

      <div className="sticky-cta">
        <Button stretched disabled={!valid || create.isPending} onClick={pay}>
          {create.isPending ? 'Создаём счёт…' : valid ? `Пополнить на ${rub(amount)}` : 'Введите сумму'}
        </Button>
      </div>

      <InvoiceSheet invoiceId={invoice?.id ?? null} onClose={() => setInvoice(null)} />
    </Page>
  )
}
