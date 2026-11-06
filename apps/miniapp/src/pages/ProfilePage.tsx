import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LuCopy } from 'react-icons/lu'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Cols, Hero, Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { LoadError } from '../components/LoadError'
import { Button } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { useBindEmail, useMe } from '../api/queries'
import { useAuth } from '../auth/AuthProvider'
import { copyText, rub } from '../lib/format'
import { haptic, isTelegram } from '../lib/telegram'
import { useIsTwoCol } from '../hooks/useMediaQuery'

// почта уходит в PUT /me/email, см. docs/api.md
function EmailSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const toast = useToast()
  const bind = useBindEmail()
  const [value, setValue] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
  return (
    <Sheet open={open} onClose={onClose} expandable={false}>
      <div className="sheet-head">
        <Lottie name={E.mail} size={80} />
        <h2>Привязка почты</h2>
        <p>На неё придут чеки об оплате и важные письма о подписке</p>
      </div>
      <label className="text-input">
        <input type="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value.trim())} autoComplete="email" />
      </label>
      <div className="sheet-actions">
        <Button
          stretched
          disabled={!valid || bind.isPending}
          onClick={() =>
            bind.mutate(value, {
              onSuccess: () => {
                haptic.notify('success')
                toast('Почта привязана', E.mail)
                onClose()
              },
              onError: (e) => {
                haptic.notify('error')
                toast(e.message || 'Не удалось привязать почту', E.warning)
              },
            })
          }
        >
          Привязать
        </Button>
        <Button stretched variant="ghost" onClick={onClose}>
          Назад
        </Button>
      </div>
    </Sheet>
  )
}

export function ProfilePage() {
  const { data: me, error: meError, refetch: refetchMe, isFetching: meFetching } = useMe()
  const { logout } = useAuth()
  const toast = useToast()
  const [emailOpen, setEmailOpen] = useState(false)
  const email = me?.email
  // на ПК у колонок подписи сверху, чтобы они начинались вровень
  const twoCol = useIsTwoCol()

  const copy = async (v: string | number, label: string) => {
    if (!(await copyText(String(v)))) {
      haptic.notify('error')
      return toast('Не удалось скопировать, выделите и скопируйте вручную', E.warning)
    }
    haptic.notify('success')
    toast(`${label} скопирован`, E.check)
  }

  return (
    <Page wide>
      <Hero emoji={E.laptopGirl} title="Мой профиль" size={120} />

      <div className="balance-card">
        <div>
          <div className="balance-label">Баланс</div>
          <div className="balance-value is-small">
            {me ? <AnimatedNumber value={me.balance} format={rub} from={0} duration={900} /> : meError ? '—' : '...'}
          </div>
        </div>
        <Link to="/topup" state={{ back: true }} className="btn btn-primary btn-m" onClick={() => haptic.tap()}>
          Пополнить
        </Link>
      </div>

      {meError && !me && <LoadError text="Не удалось загрузить профиль" onRetry={() => refetchMe()} busy={meFetching} />}

      <Cols
        left={
          <>
            <Section title="Аккаунт">
              <Cell
                icon={<Lottie name={E.mail} size={32} />}
                title="Электронная почта"
                subtitle={email ?? 'Не привязана'}
                after={
                  email ? undefined : (
                    <Button size="s" variant="secondary" onClick={() => setEmailOpen(true)}>
                      Привязать
                    </Button>
                  )
                }
              />
              {me && (
                <>
                  <Cell
                    icon={<Lottie name={E.vCircle} size={32} />}
                    title="Ваш ID"
                    subtitle={String(me.id)}
                    after={
                      <span className="icon-btn">
                        <LuCopy size={18} />
                      </span>
                    }
                    onClick={() => copy(me.id, 'ID')}
                    chevron={false}
                  />
                  <Cell
                    icon={<Lottie name={E.megaphoneTile} size={32} />}
                    title="Telegram ID"
                    subtitle={String(me.tg_user_id)}
                    after={
                      <span className="icon-btn">
                        <LuCopy size={18} />
                      </span>
                    }
                    onClick={() => copy(me.tg_user_id, 'Telegram ID')}
                    chevron={false}
                  />
                </>
              )}
            </Section>
          </>
        }
        right={
          <>
            <Section title={twoCol ? 'Приложение' : undefined}>
              <Cell icon={<Lottie name={E.bulbTile} size={32} />} title="Информация" subtitle="Ответы на частые вопросы" to="/info" state={{ back: true }} />
              <Cell icon={<Lottie name={E.questionTile} size={32} />} title="Помощь" subtitle="Если что-то не работает" to="/help" state={{ back: true }} />
              <Cell icon={<Lottie name={E.gearTile} size={32} />} title="Оформление" subtitle="Тема и палитра" to="/ui" state={{ back: true }} />
            </Section>
          </>
        }
      />

      {!isTelegram && (
        <div className="logout">
          <Section>
            <Cell tone="danger" icon={<Lottie name={E.wave} size={30} />} title="Выйти из аккаунта" onClick={logout} chevron={false} />
          </Section>
        </div>
      )}

      <p className="app-version">VPNHub · v{__APP_VERSION__}</p>

      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </Page>
  )
}
