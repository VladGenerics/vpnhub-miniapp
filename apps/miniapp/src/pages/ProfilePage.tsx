import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Page } from '../components/Page'
import { Section, Cell } from '../components/List'
import { Lottie } from '../components/Lottie'
import { Button } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { E } from '../data/emoji'
import { useMe } from '../api/queries'
import { USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthProvider'
import { copyText, rub } from '../lib/format'
import { getTgUser, haptic, isTelegram } from '../lib/telegram'

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
)

function ProfileHeader() {
  const u = getTgUser()
  const name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : 'Гость'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <header className="profile-head">
      {u?.photo_url ? <img className="avatar" src={u.photo_url} alt="" /> : <div className="avatar">{initials}</div>}
      <h1>{name}</h1>
      <p>{u?.username ? `@${u.username}` : 'Веб-версия'}</p>
    </header>
  )
}

// TODO: привязка почты — в database.dbml нет поля email, ждём эндпоинт от бэкенда
function EmailSheet({ open, onClose, bindEmail }: { open: boolean; onClose(): void; bindEmail(v: string): void }) {
  const toast = useToast()
  const [value, setValue] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
  return (
    <Sheet open={open} onClose={onClose} expandable={false}>
      <div className="sheet-head">
        <Lottie name={E.mail} size={80} />
        <h2>Привязка почты</h2>
        <p>Почта нужна для входа с сайта и восстановления доступа к подписке</p>
      </div>
      <label className="text-input">
        <input type="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value.trim())} autoComplete="email" />
      </label>
      <div className="sheet-actions">
        <Button
          stretched
          disabled={!valid}
          onClick={() => {
            bindEmail(value)
            haptic.notify('success')
            toast('Почта привязана', E.mail)
            onClose()
          }}
        >
          Привязать
        </Button>
      </div>
    </Sheet>
  )
}

export function ProfilePage() {
  const { data: me } = useMe()
  const { logout } = useAuth()
  const toast = useToast()
  const [emailOpen, setEmailOpen] = useState(false)
  const [localEmail, setLocalEmail] = useState<string | null>(null)
  const email = me?.email ?? localEmail

  const copy = async (v: string | number, label: string) => {
    await copyText(String(v))
    haptic.notify('success')
    toast(`${label} скопирован`, E.check)
  }

  return (
    <Page>
      <ProfileHeader />

      <div className="balance-card">
        <div>
          <div className="balance-label">Баланс</div>
          <div className="balance-value is-small">
            {me ? <AnimatedNumber value={me.balance} format={rub} from={0} duration={900} /> : '…'}
          </div>
        </div>
        <Link to="/topup" className="btn btn-primary btn-m" onClick={() => haptic.tap()}>
          Пополнить
        </Link>
      </div>

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
              after={<span className="icon-btn">{<CopyIcon />}</span>}
              onClick={() => copy(me.id, 'ID')}
              chevron={false}
            />
            <Cell
              icon={<Lottie name={E.megaphoneTile} size={32} />}
              title="Telegram ID"
              subtitle={String(me.tg_user_id)}
              after={<span className="icon-btn">{<CopyIcon />}</span>}
              onClick={() => copy(me.tg_user_id, 'Telegram ID')}
              chevron={false}
            />
          </>
        )}
      </Section>

      <Section>
        <Cell icon={<Lottie name={E.bulbTile} size={32} />} title="Информация" subtitle="Ответы на частые вопросы" to="/info" />
        <Cell icon={<Lottie name={E.questionTile} size={32} />} title="Помощь" subtitle="Если что-то не работает" to="/help" />
        <Cell icon={<Lottie name={E.gearTile} size={32} />} title="Оформление" subtitle="Тема, палитра и компоненты" to="/ui" />
      </Section>

      {!isTelegram && (
        <Section>
          <Cell tone="danger" icon={<Lottie name={E.wave} size={30} />} title="Выйти из аккаунта" onClick={logout} chevron={false} />
        </Section>
      )}

      <p className="app-version">VPNHub · v0.2{USE_MOCKS ? ' · демо-данные' : ''}</p>

      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} bindEmail={setLocalEmail} />
    </Page>
  )
}
