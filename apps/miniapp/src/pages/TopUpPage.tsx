import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Invoice, PaymentMethod } from '@vpnhub/shared'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Page } from '../components/Page'
import { Section, Cell, Chevron } from '../components/List'
import { LuLock, LuPencil } from 'react-icons/lu'
import { Lottie } from '../components/Lottie'
import { LoadError } from '../components/LoadError'
import { Button, Chips } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { PROVIDER_LOOK, TOPUP_PRESETS } from '../data/content'
import { useActiveSubscription, useCreateInvoice, useInvoice, useMe, usePaymentMethods, useUnpaidInvoices } from '../api/queries'
import { useRenewal } from '../hooks/useRenewal'
import { useSingleFlight } from '../hooks/useSingleFlight'
import { draft } from '../lib/draft'
import { rub } from '../lib/format'
import { haptic, isTelegram, openPayment, safeExternalUrl } from '../lib/telegram'
import { celebrate } from '../lib/confetti'
import { useIsTwoCol } from '../hooks/useMediaQuery'

const MAX = 1_000_000

/** Ссылка на оплату. В Telegram открываем его средствами, в браузере - обычная ссылка в новой вкладке */
function PayLink({ url: raw, className, children, onOpen }: { url: string; className: string; children: ReactNode; onOpen?(): void }) {
  const toast = useToast()
  // адрес приходит из API: не https (javascript:, data: и т. п.) не открываем
  const url = safeExternalUrl(raw)
  if (!url)
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          haptic.notify('error')
          toast('Ссылка на оплату некорректна, напишите в поддержку', E.warning)
        }}
      >
        {children}
      </button>
    )
  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        haptic.tap()
        onOpen?.()
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
function InvoiceSheet({ invoiceId, onClose, onWatch, onResume }: { invoiceId: number | null; onClose(): void; onWatch(id: number): void; onResume?(): void }) {
  const { data: inv, refetch, isFetching, error } = useInvoice(invoiceId)
  const { data: me } = useMe()
  const toast = useToast()
  const [checking, setChecking] = useState(false)
  // «Проверить оплату» имеет смысл только после перехода к оплате, до этого кнопка лишь путает
  const [opened, setOpened] = useState(false)
  useEffect(() => setOpened(false), [invoiceId])
  // закрыли окно после перехода к оплате, а деньги ещё не дошли: счёт продолжает проверяться в фоне
  const close = () => {
    if (opened && inv?.status === 'UNPAID') onWatch(inv.id)
    onClose()
  }

  // конфетти только на переходе «ждём оплату → оплачено», а не при открытии уже оплаченного счёта
  const prevStatus = useRef(inv?.status)
  useEffect(() => {
    const was = prevStatus.current
    prevStatus.current = inv?.status
    if (inv?.status === 'PAID') {
      haptic.notify('success')
      if (was === 'UNPAID') celebrate()
    }
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
    <Sheet open={invoiceId !== null} onClose={close} expandable={false}>
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
            <Button stretched variant="ghost" onClick={close}>
              Вернуться
            </Button>
          </div>
        </>
      ) : !inv || inv.status === 'UNPAID' ? (
        <>
          {head(
            E.walletTile,
            inv ? `Счёт на ${rub(inv.amount)}` : 'Счёт',
            !inv?.pay_url
              ? 'Готовим ссылку на оплату...'
              : opened
                ? 'Оплатили? Баланс пополнится сам через несколько секунд, или нажмите «Проверить оплату»'
                : 'Оплата откроется на странице платёжной системы',
          )}
          <div className="sheet-actions">
            {inv?.pay_url ? (
              <PayLink url={inv.pay_url} className="btn btn-primary btn-l is-stretched" onOpen={() => setOpened(true)}>
                Перейти к оплате
              </PayLink>
            ) : (
              <Button stretched disabled hint="Ссылка готовится">
                <span className="spinner" /> Готовим ссылку
              </Button>
            )}
            {opened && (
              <Button stretched variant="secondary" onClick={check} disabled={!inv || checking}>
                {checking ? 'Проверяем...' : 'Проверить оплату'}
              </Button>
            )}
            <Button stretched variant="ghost" onClick={close}>
              Вернуться
            </Button>
          </div>
        </>
      ) : inv.status === 'PAID' ? (
        <>
          {head(E.party, 'Баланс пополнен', `+${rub(inv.amount)} зачислено.${me ? ` Теперь на балансе ${rub(me.balance)}` : ''}`)}
          <div className="sheet-actions">
            {onResume ? (
              <>
                <Button stretched onClick={onResume}>
                  Вернуться к оформлению
                </Button>
                <Button stretched variant="ghost" onClick={onClose}>
                  Остаться здесь
                </Button>
              </>
            ) : (
              <Button stretched onClick={onClose}>
                Готово
              </Button>
            )}
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
/**
 * Счёт, который открыли на оплату, но окно счёта уже закрыто (оплата из списка или «Вернуться» до зачисления):
 * опрашиваем его часто, как окно счёта, а не ждём общий опрос списка. useInvoice сам обновит баланс и список
 */
function useWatchInvoice() {
  const [watchId, setWatchId] = useState<number | null>(null)
  const { data: watched, refetch } = useInvoice(watchId)
  const toast = useToast()
  // в фоне таймер опроса стоит: вернулись со страницы оплаты - проверяем счёт сразу
  useEffect(() => {
    if (watchId === null) return
    const onVisible = () => document.visibilityState === 'visible' && refetch()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [watchId, refetch])
  useEffect(() => {
    if (!watched || watched.status === 'UNPAID') return
    if (watched.status === 'PAID') {
      haptic.notify('success')
      celebrate()
      toast(`Баланс пополнен на ${rub(watched.amount)}`, E.party)
    }
    setWatchId(null)
  }, [watched?.status])
  return setWatchId
}

// panel - на ПК карточкой с заголовком внутри, как «Итого» над ней
function UnpaidInvoices({ methods, onWatch, panel = false }: { methods?: PaymentMethod[]; onWatch(id: number): void; panel?: boolean }) {
  const { data: list, error, refetch, isFetching } = useUnpaidInvoices()
  const [expanded, setExpanded] = useState(false)
  // вернулись из вкладки или приложения оплаты - проверяем сразу, не дожидаясь таймера
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refetch()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetch])
  // первая загрузка не удалась - это не «счетов нет»: показываем ошибку с повтором
  if (error && !list) return <LoadError text="Не удалось загрузить неоплаченные счета" onRetry={() => refetch()} busy={isFetching} />
  if (!list?.length) return null
  const hidden = list.length - UNPAID_VISIBLE
  const shown = expanded || hidden <= 0 ? list : list.slice(0, UNPAID_VISIBLE)
  const name = (inv: Invoice) => methods?.find((m) => m.provider === inv.provider)?.name ?? inv.provider
  const rows = (
    <>
      {shown.map((inv, i) => {
        // строки из «Показать ещё» появляются плавно, без общей пружины: иначе текст подпрыгивает
        const more = i >= UNPAID_VISIBLE ? ' is-more' : ''
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
          <PayLink key={inv.id} url={inv.pay_url} className={`cell tone-default is-interactive${more}`} onOpen={() => onWatch(inv.id)}>
            {inner}
          </PayLink>
        ) : (
          <div key={inv.id} className={`cell tone-default${more}`}>
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
    </>
  )
  const hint = 'Нажмите на счёт, чтобы перейти к оплате'
  return panel ? (
    <div className="panel">
      <h2 className="panel-title">Неоплаченные счета</h2>
      <div className="section-card">{rows}</div>
      <p className="panel-hint">{hint}</p>
    </div>
  ) : (
    <Section title="Неоплаченные счета" footer={hint}>
      {rows}
    </Section>
  )
}

/** Сумма из ссылки (?amount=300 - «Пополнить на 300 ₽» из окна покупки), иначе 500 */
function initialAmount(v: string | null) {
  const n = Math.ceil(Number(v))
  // больше лимита - ставим лимит, а не 500: остальное доплатят вторым счётом
  return n > 0 ? String(Math.min(n, MAX)) : '500'
}

export function TopUpPage() {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { data: methods, error: methodsError, refetch: refetchMethods, isFetching: methodsFetching } = usePaymentMethods()
  const create = useCreateInvoice()
  const toast = useToast()
  const [sp] = useSearchParams()
  // открыли из меню - это раздел, «Назад» не нужен; перешли с подписки или профиля - нужен
  const { state } = useLocation()
  const twoCol = useIsTwoCol()
  // на ПК в шапке: сколько не хватает на автопродление
  const { active } = useActiveSubscription()
  const renewal = useRenewal(active)
  const linkAmount = sp.get('amount')
  const [raw, setRaw] = useState(() => initialAmount(linkAmount))
  // сумма подставлена ссылкой, а не введена руками: такую подгоняем под минимум выбранного способа
  const [autoAmount, setAutoAmount] = useState(() => !!linkAmount)
  // пришли с покупки: после оплаты ведём обратно к ней, выбор там сохранён. Флаг в черновике переживает
  // закрытие окна счёта, оплату во второй вкладке и из списка счетов
  const resume = !!(state as { resume?: boolean } | null)?.resume || !!draft.get()?.resume
  const navigate = useNavigate()
  const [providerId, setProviderId] = useState<number | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const watch = useWatchInvoice()

  const method: PaymentMethod | undefined = methods?.find((m) => m.id === providerId) ?? methods?.[0]
  const min = method?.min_amount ?? 0
  const amount = Number(raw) || 0
  const error = raw && amount < min ? `Минимальная сумма — ${rub(min)}` : amount > MAX ? `Максимум — ${rub(MAX)}` : ''
  const valid = !!method && amount >= min && amount <= MAX
  // почему «Пополнить» недоступна - подсказка на кнопке
  const payHint = methods?.length === 0 ? 'Оплата недоступна' : !method ? 'Выберите способ оплаты' : !amount ? `Минимум ${rub(min)}` : error

  // сумма из ссылки: страница могла открыться без перемонтирования, берём свежую
  useEffect(() => {
    if (!linkAmount) return
    setRaw(initialAmount(linkAmount))
    setAutoAmount(true)
  }, [linkAmount])
  // подставленная сумма не ниже минимума выбранного способа: при смене способа пересчитываем от нужной суммы
  useEffect(() => {
    if (!autoAmount || !method) return
    const need = Number(initialAmount(linkAmount))
    setRaw(String(Math.min(MAX, Math.max(need, Math.ceil(min)))))
  }, [min, linkAmount, autoAmount, method?.id])
  const setManual = (v: string) => {
    setAutoAmount(false)
    setRaw(v)
  }

  const once = useSingleFlight()
  const pay = () => {
    if (!method || !valid) return
    once((done) =>
      create.mutate(
        { provider: method.provider, amount },
        {
          onSettled: done,
          // ссылку открывает кнопка в окне счёта: без клика браузеры и Telegram её блокируют
          onSuccess: setInvoice,
          onError: (e) => {
            haptic.notify('error')
            // например лимит неоплаченных счетов: текст приходит из detail бэкенда
            toast(e.message || 'Не удалось создать счёт', E.warning)
          },
        },
      ),
    )
  }
  const backToPurchase = () => navigate('/', { replace: true })
  // пополняют посреди покупки: путь назад виден всё время, а не только в окне оплаченного счёта
  const resumeBanner = resume && (
    <div className="resume-card">
      <Lottie name={E.bell} size={30} />
      <div className="resume-card-text">
        <b>Выбор покупки сохранён</b>
        <span>Пополните баланс и вернитесь к оформлению</span>
      </div>
      <Button variant="secondary" size="s" onClick={backToPurchase}>
        Вернуться
      </Button>
    </div>
  )

  // сумму можно ввести самому: поле выглядит как поле ввода, с карандашом; пресеты - вторым вариантом
  const amountField = (
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
          // только цифры и без ведущих нулей: «0111» превращается в «111», а не висит в поле
          onChange={(e) => setManual(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
          aria-label="Сумма пополнения"
        />
      </span>
      <span className="amount-currency">₽</span>
      <LuPencil className="amount-edit" size={18} aria-hidden />
    </label>
  )
  const presets = <Chips items={TOPUP_PRESETS} value={amount} onChange={(v) => setManual(String(v))} render={(v) => rub(v)} />
  const amountNote = error ? <span className="error">{error}</span> : `От ${rub(min)} до ${rub(MAX)}`
  const amountBlock = (
    <Section title="Сумма пополнения" footer={amountNote}>
      <div className="amount-hint">Введите свою сумму</div>
      {amountField}
      <div className="amount-hint">или выберите</div>
      <div className="plan-row is-column amount-presets">{presets}</div>
    </Section>
  )
  const methodsBlock = (
    <>
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
        {methods?.length === 0 && (
          <Cell icon={<Lottie name={E.warning} size={36} />} title="Способы оплаты временно недоступны" subtitle="Попробуйте позже или напишите в поддержку" />
        )}
      </Section>
      {methodsError && !methods && <LoadError text="Не удалось загрузить способы оплаты" onRetry={() => refetchMethods()} busy={methodsFetching} />}
    </>
  )
  const cta = (
    <div className="sticky-cta">
      <Button stretched disabled={!valid || create.isPending} hint={payHint} onClick={pay}>
        {create.isPending ? 'Создаём счёт…' : methods?.length === 0 ? 'Оплата недоступна' : valid ? `Пополнить на ${rub(amount)}` : 'Введите сумму'}
      </Button>
    </div>
  )
  const unpaidBlock = <UnpaidInvoices methods={methods} onWatch={watch} />

  const balanceText = me ? <AnimatedNumber value={me.balance} format={rub} from={0} duration={900} /> : meError ? '—' : '...'
  const lacking = renewal?.enabled ? Math.ceil(renewal.lacking) : 0

  // ПК по макету заказчика: слева сумма и способ, справа «Итого» с суммой пополнения и кнопкой, под ним счета
  const desktop = (
    <>
      <header className="page-head">
        <h1>Пополнение баланса</h1>
      </header>
      <div className="page-head-sub">
        <span>
          Текущий баланс <b>{balanceText}</b>
        </span>
        {lacking > 0 && (
          <>
            <i className="page-head-sep" />
            <span>
              Для автопродления не хватает <b className="renew-lacking">{rub(lacking)}</b>
            </span>
          </>
        )}
      </div>
      {meError && !me && <LoadError text="Не удалось загрузить баланс" onRetry={() => refetchMe()} busy={meFetching} />}

      <div className="topup-grid">
        <div className="panel">
          <h2 className="panel-title">Сумма и способ оплаты</h2>
          <div className="field-label">Введите сумму пополнения</div>
          {amountField}
          <div className="field-note">{amountNote}</div>
          <div className="amount-presets-row">{presets}</div>

          <div className="field-label">Способ оплаты</div>
          <div className="method-list" role="radiogroup" aria-label="Способ оплаты">
            {methods?.map((m) => {
              const look = PROVIDER_LOOK[m.provider]
              const on = method?.id === m.id
              return (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={on}
                  className={`method-row ${on ? 'is-on' : ''}`}
                  onClick={() => {
                    haptic.select()
                    setProviderId(m.id)
                  }}
                >
                  <Lottie name={look?.emoji ?? E.cardTile} size={34} />
                  <span className="method-row-main">
                    <b>{m.name}</b>
                    {look?.subtitle && <span>{look.subtitle}</span>}
                  </span>
                  <span className={`radio ${on ? 'is-on' : ''}`} />
                </button>
              )
            }) ?? (methodsError ? null : <div className="skeleton is-card" />)}
            {methods?.length === 0 && <p className="field-note">Способы оплаты временно недоступны. Попробуйте позже или напишите в поддержку</p>}
          </div>
          {methodsError && !methods && <LoadError text="Не удалось загрузить способы оплаты" onRetry={() => refetchMethods()} busy={methodsFetching} />}
        </div>

        <div className="topup-side">
          {resumeBanner}
          {/* только то, что пополняется: сумма после оплаты здесь путала бы, будто зачислится больше */}
          <div className="panel">
            <h2 className="panel-title">Итого</h2>
            <div className="summary-row">
              <span>Текущий баланс</span>
              <b>{me ? rub(me.balance) : '—'}</b>
            </div>
            <div className="summary-row">
              <span>Способ оплаты</span>
              <b>{method?.name ?? '—'}</b>
            </div>
            <div className="summary-row is-total">
              <span>Сумма пополнения</span>
              <b>{valid ? rub(amount) : '—'}</b>
            </div>
            <Button stretched disabled={!valid || create.isPending} hint={payHint} onClick={pay}>
              {create.isPending ? 'Создаём счёт…' : methods?.length === 0 ? 'Оплата недоступна' : valid ? 'Перейти к оплате' : 'Введите сумму'}
            </Button>
            <p className="summary-note">
              <LuLock size={14} /> Оплата откроется на защищённой странице
            </p>
          </div>
          <UnpaidInvoices methods={methods} onWatch={watch} panel />
        </div>
      </div>
    </>
  )

  return (
    <Page wide back={!!(state as { back?: boolean } | null)?.back}>
      {twoCol ? (
        desktop
      ) : (
        <>
          <header className="balance-hero">
            <Lottie name={E.walletTile} size={64} />
            <div className="balance-label">Текущий баланс</div>
            <div className="balance-value">{balanceText}</div>
          </header>
          {meError && !me && <LoadError text="Не удалось загрузить баланс" onRetry={() => refetchMe()} busy={meFetching} />}
          {resumeBanner}
          {amountBlock}
          {unpaidBlock}
          {methodsBlock}
          {cta}
        </>
      )}

      <InvoiceSheet invoiceId={invoice?.id ?? null} onClose={() => setInvoice(null)} onWatch={watch} onResume={resume ? backToPurchase : undefined} />
    </Page>
  )
}
