import { useEffect, useState, type FormEvent } from 'react'
import type { AdminSettings } from '@vpnhub/shared'
import { useSettings, useUpdateSettings } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { Segmented } from '../components/Segmented'
import { useToast } from '../components/Toast'
import { Button, Card, ErrorView, Field, PageHead, Skeleton, useMoneyInput } from '../components/ui'
import { dateTime, rub } from '../lib/format'
import { PALETTES, setPalette, usePalette } from '../lib/palette'
import { setThemeMode, useThemeMode, type ThemeMode } from '../lib/theme'

const MAX_BONUS = 100_000

/** «@vpnhub_support» и «t.me/…» достраиваем до полной ссылки — так их обычно и вставляют */
function normalizeLink(v: string) {
  const t = v.trim()
  if (/^@\w{3,}$/.test(t)) return `https://t.me/${t.slice(1)}`
  if (/^t\.me\//i.test(t)) return `https://${t}`
  return t
}

/** Ссылка поддержки: https://t.me/…, любая https-ссылка или tg:// */
function linkError(v: string) {
  if (!v.trim()) return 'Укажите ссылку'
  try {
    const u = new URL(normalizeLink(v))
    if (!['https:', 'http:', 'tg:'].includes(u.protocol)) return 'Ссылка должна начинаться с https:// или tg://'
    return null
  } catch {
    return 'Это не похоже на ссылку. Пример: https://t.me/vpnhub_support'
  }
}

const bonusError = (v: number) => (!(v >= 0) ? 'Укажите сумму (0 — без бонуса)' : v > MAX_BONUS ? `Не больше ${rub(MAX_BONUS)}` : null)

function SettingsForm({ s }: { s: AdminSettings }) {
  const { canEdit } = useAuth()
  const toast = useToast()
  const update = useUpdateSettings()
  const [link, setLink] = useState(s.support_link)
  const invited = useMoneyInput(String(s.invited_bonus))
  const referral = useMoneyInput(String(s.referral_bonus))
  const [touched, setTouched] = useState(false)

  // после сохранения в форме — то, что вернул сервер
  useEffect(() => setLink(s.support_link), [s.support_link])

  const errors = {
    link: linkError(link),
    invited: bonusError(invited.value),
    referral: bonusError(referral.value),
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const dirty = normalizeLink(link) !== s.support_link || invited.value !== s.invited_bonus || referral.value !== s.referral_bonus

  const reset = () => {
    setLink(s.support_link)
    invited.reset()
    referral.reset()
    setTouched(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors || !dirty) return
    update.mutate(
      {
        support_link: normalizeLink(link),
        invited_bonus: invited.value,
        referral_bonus: referral.value,
      },
      {
        onSuccess: (r) => {
          setLink(r.support_link)
          setTouched(false)
          toast('Настройки сохранены')
        },
        onError: (err) => toast((err as Error).message, 'error'),
      },
    )
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Ссылка на поддержку" hint="Кнопка «Поддержка» в мини-аппе, кабинете и боте. Можно вставить @username" error={show('link')}>
        {(id) => (
          <input
            id={id}
            className={`input ${show('link') ? 'has-error' : ''}`}
            type="url"
            inputMode="url"
            value={link}
            disabled={!canEdit}
            placeholder="https://t.me/vpnhub_support"
            onChange={(e) => setLink(e.target.value)}
            onBlur={() => setTouched(true)}
          />
        )}
      </Field>

      <div className="form-row">
        <Field label="Бонус приглашённому" hint="Начисляется новому пользователю, пришедшему по ссылке" error={show('invited')}>
          {(id) => (
            <div className="input-wrap">
              <input
                id={id}
                className={`input has-suffix ${show('invited') ? 'has-error' : ''}`}
                style={{ paddingLeft: 12 }}
                inputMode="decimal"
                value={invited.raw}
                disabled={!canEdit}
                onChange={(e) => invited.set(e.target.value)}
              />
              <span className="input-suffix">₽</span>
            </div>
          )}
        </Field>
        <Field label="Бонус пригласившему" hint="Начисляется тому, кто пригласил" error={show('referral')}>
          {(id) => (
            <div className="input-wrap">
              <input
                id={id}
                className={`input has-suffix ${show('referral') ? 'has-error' : ''}`}
                style={{ paddingLeft: 12 }}
                inputMode="decimal"
                value={referral.raw}
                disabled={!canEdit}
                onChange={(e) => referral.set(e.target.value)}
              />
              <span className="input-suffix">₽</span>
            </div>
          )}
        </Field>
      </div>

      {canEdit ? (
        <div className="form-actions">
          <Button type="submit" variant="primary" loading={update.isPending} disabled={!dirty}>
            Сохранить
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={reset}>
              Отменить
            </Button>
          )}
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
            {s.updated_at ? `Изменено ${dateTime(s.updated_at)}` : ''}
          </span>
        </div>
      ) : (
        <p className="muted">Роль «Поддержка» может только смотреть настройки.</p>
      )}
    </form>
  )
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

/** Тема и палитра панели — те же варианты, что в кабинете. Запоминаются в этом браузере. */
function AppearanceCard() {
  const theme = useThemeMode()
  const palette = usePalette()
  return (
    <Card title="Оформление" sub="Только для вас и только в этом браузере">
      <div className="form">
        <Field label="Тема">{() => <Segmented<ThemeMode> options={THEME_OPTIONS} value={theme} onChange={setThemeMode} label="Тема" />}</Field>
        <Field label="Палитра" hint="Как в кабинете пользователя">
          {() => (
            <div className="palette-picker" role="radiogroup" aria-label="Палитра">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={palette === p.id}
                  className={`palette-option ${palette === p.id ? 'is-active' : ''}`}
                  onClick={() => setPalette(p.id)}
                >
                  <span className="palette-swatch" style={{ background: p.swatch[0] }}>
                    <i style={{ background: p.swatch[1] }} />
                  </span>
                  <span className="palette-name">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>
    </Card>
  )
}

export function SettingsPage() {
  const { data, error, refetch } = useSettings()
  return (
    <>
      <PageHead title="Настройки проекта" />
      <div className="stack">
        <Card title="Поддержка и реферальная программа">
          {error && !data ? (
            <ErrorView error={error} onRetry={refetch} />
          ) : data ? (
            <SettingsForm s={data} />
          ) : (
            <div className="stack" style={{ maxWidth: 560 }}>
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          )}
        </Card>
        <AppearanceCard />
      </div>
    </>
  )
}
