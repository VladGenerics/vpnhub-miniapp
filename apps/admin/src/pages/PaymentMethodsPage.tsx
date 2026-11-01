import { useState, type KeyboardEvent } from 'react'
import { PROVIDER_LABEL, type PaymentMethod } from '@vpnhub/shared'
import { usePaymentMethods, useUpdatePaymentMethod } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Button, Card, ErrorView, PageHead, Skeleton, Switch, useMoneyInput } from '../components/ui'
import { rub } from '../lib/format'

const MAX_NAME = 64

function MethodRow({ m, canEdit }: { m: PaymentMethod; canEdit: boolean }) {
  const [name, setName] = useState(m.name)
  const min = useMoneyInput(String(m.min_amount))
  const update = useUpdatePaymentMethod()
  const toast = useToast()

  const nameErr = !name.trim() ? 'Введите название' : null
  const minErr = !(min.value >= 0) ? 'Укажите сумму' : null
  const dirty = name.trim() !== m.name || min.value !== m.min_amount
  const busy = update.isPending

  const cancel = () => {
    setName(m.name)
    min.reset()
  }

  const save = () => {
    if (!dirty || nameErr || minErr) return
    update.mutate(
      { id: m.id, patch: { name: name.trim(), min_amount: min.value } },
      {
        onSuccess: (r) => {
          setName(r.name)
          toast('Изменения сохранены')
        },
        onError: (e) => toast((e as Error).message, 'error'),
      },
    )
  }

  const toggle = (is_active: boolean) =>
    update.mutate(
      { id: m.id, patch: { is_active } },
      {
        onSuccess: () => toast(is_active ? `«${m.name}» включена` : `«${m.name}» выключена — пользователи её не увидят`),
        onError: (e) => toast((e as Error).message, 'error'),
      },
    )

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  return (
    <div className={`pm-row ${m.is_active ? '' : 'is-off'}`}>
      <span className="pm-order">{m.sequence_number}</span>
      <div className="pm-name">
        {canEdit ? (
          <input
            className={`input ${nameErr ? 'has-error' : ''}`}
            value={name}
            maxLength={MAX_NAME}
            aria-label={`Название способа ${PROVIDER_LABEL[m.provider]}`}
            aria-invalid={!!nameErr}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKey}
          />
        ) : (
          <b>{m.name}</b>
        )}
      </div>
      <span className="pm-provider muted">{PROVIDER_LABEL[m.provider]}</span>
      <div className="pm-min">
        {canEdit ? (
          <div className="input-wrap">
            <input
              className={`input has-suffix ${minErr ? 'has-error' : ''}`}
              style={{ paddingLeft: 12 }}
              inputMode="decimal"
              value={min.raw}
              aria-label={`Минимальная сумма для ${m.name}`}
              onChange={(e) => min.set(e.target.value)}
              onKeyDown={onKey}
            />
            <span className="input-suffix">₽</span>
          </div>
        ) : (
          <span>от {rub(m.min_amount)}</span>
        )}
      </div>
      <div className="pm-actions">
        {dirty && canEdit && (
          <>
            <Button size="sm" variant="ghost" icon="close" aria-label="Отменить изменения" title="Отменить (Esc)" onClick={cancel} disabled={busy} />
            <Button size="sm" variant="primary" icon="check" onClick={save} loading={busy} disabled={!!nameErr || !!minErr}>
              Сохранить
            </Button>
          </>
        )}
        <Switch checked={m.is_active} onChange={toggle} label={m.is_active ? 'Активна — выключить' : 'Выключена — включить'} disabled={!canEdit || busy} />
      </div>
    </div>
  )
}

export function PaymentMethodsPage() {
  const { data, error, refetch } = usePaymentMethods()
  const { canEdit } = useAuth()
  const active = data?.filter((m) => m.is_active).length ?? 0

  return (
    <>
      <PageHead title="Платёжные системы" />
      <Card
        flush
        title="Способы оплаты"
        sub={data ? `Включено ${active} из ${data.length}. Выключенные способы не показываются в мини-аппе и кабинете.` : ' '}
      >
        {error && !data ? (
          <ErrorView error={error} onRetry={refetch} />
        ) : (
          <div className="pm-list" role="list">
            <div className="pm-row is-head" aria-hidden>
              <span>№</span>
              <span>Название для пользователей</span>
              <span>Провайдер</span>
              <span>Мин. сумма</span>
              <span style={{ textAlign: 'right' }}>Активна</span>
            </div>
            {data
              ? data.map((m) => (
                  <div role="listitem" key={m.id} style={{ display: 'contents' }}>
                    <MethodRow m={m} canEdit={canEdit} />
                  </div>
                ))
              : Array.from({ length: 5 }, (_, i) => (
                  <div className="pm-row" key={i}>
                    <Skeleton width={16} />
                    <Skeleton width="70%" height={20} />
                    <Skeleton width="60%" />
                    <Skeleton width="50%" />
                    <Skeleton width={40} height={24} />
                  </div>
                ))}
          </div>
        )}
      </Card>
      {!canEdit && (
        <p className="muted" style={{ marginTop: 12 }}>
          Роль «Поддержка» может только смотреть настройки оплаты.
        </p>
      )}
    </>
  )
}
