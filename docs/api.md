# API для фронтенда VPNHub

Что ждут от бэкенда кабинет и админка. Точные типы — в [`packages/shared/src/types.ts`](../packages/shared/src/types.ts)
(кабинет) и [`packages/shared/src/admin.ts`](../packages/shared/src/admin.ts) (админка), здесь пояснения к ним.
Как ведёт себя каждая ручка, можно посмотреть в демо: `apps/miniapp/src/api/mock.ts` и `apps/admin/src/api/mock/`.

Если у вас другие пути или поля, правится один файл: `apps/*/src/api/index.ts`.

## Общие правила

- Базовый адрес — `VITE_API_URL`, например `https://api.example.com/api`. Пути ниже от него.
- JSON, поля как колонки в `database.dbml` (snake_case).
- Деньги — число в рублях (`1234.5`), скидки — доля от 0 до 1.
- Даты — ISO 8601 с поясом (`2026-11-01T09:30:00Z`).
- Ошибка — любой не-2xx с телом `{ "detail": "Текст" }` (как в FastAPI) или `{ "message": "Текст" }`.
  Текст показывается пользователю как есть. Ошибки валидации FastAPI (`detail` списком) тоже понимает,
  показывается первая.
- Особые коды: `401` — токен протух, фронт выкидывает на вход; `403` — нет прав; `404` — не найдено.
- Ответ без тела — `204`.
- Фронт ждёт ответ 30 секунд, потом пишет «Сервер долго не отвечает». Обрыв сети и `5xx` повторяет один раз.

### CORS

Нужен, только если API на другом домене. Разрешите origin кабинета и админки, методы
`GET, POST, PUT, PATCH, DELETE` и заголовки `Authorization, Content-Type`. Куки не используются.

## Авторизация

Схема одна для кабинета и админки.

Внутри Telegram каждый запрос идёт с заголовком

```
Authorization: tma <initData>
```

`initData` — это `Telegram.WebApp.initData`. Бэкенд проверяет подпись токеном бота
([как](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)) и свежесть `auth_date`,
пользователя берёт из поля `user`. Нового — регистрирует.

В браузере вход через Telegram Login Widget:

`POST /auth/telegram` — тело `TelegramLoginRequest`:

```json
{ "id": 123456789, "first_name": "Иван", "username": "ivan", "photo_url": "https://…",
  "auth_date": 1793500000, "hash": "…", "ref": "promo2026" }
```

Бэкенд проверяет `hash` ([как](https://core.telegram.org/widgets/login#checking-authorization)),
при первом входе регистрирует пользователя (`ref` — `ref_links.code` или ID пригласившего, может не быть)
и отвечает `{ "token": "…" }`. Дальше запросы идут с `Authorization: Bearer <token>`.
Срок жизни токена любой, по `401` фронт просит войти заново.

Для виджета домен сайта нужно привязать к боту: @BotFather → `/setdomain`.

Без авторизации фронт ходит только в `POST /auth/telegram` и `GET /settings` (страница входа по реф. ссылке
показывает размер бонуса). Если `/settings` закрыт, сумма бонуса просто не покажется.

## Кабинет пользователя

| Метод и путь | Тело | Ответ |
|---|---|---|
| `POST /auth/telegram` | `TelegramLoginRequest` | `AuthResponse` |
| `GET /me` | | `Me` — пользователь и баланс кошелька |
| `PUT /me/email` | `{ email }` | `Me` с новой почтой. Занята или неверна — `422` с `detail` |
| `GET /subscription` | | `Subscription`; подписки нет — `404` |
| `GET /tariffs` | | `Tariffs` — цены, скидки за устройства, общая и персональная скидка |
| `GET /payment-methods` | | `PaymentMethod[]` — только включённые, по `sequence_number` |
| `GET /settings` | | `PublicSettings` — ссылка на поддержку и размеры реф. бонусов |
| `POST /invoices` | `{ provider, amount }` | `Invoice` с `pay_url` |
| `GET /invoices/:id` | | `Invoice` |
| `POST /subscription/purchase` | `{ days, devices }` | `Subscription` после покупки |
| `PUT /subscription/auto-renewal` | `{ is_enabled, days }` | `AutoRenewal` |
| `POST /subscription/slots/:id/release` | | `204` — отвязать устройство, слот остаётся |
| `DELETE /subscription/slots/:id` | | `204` — удалить слот из подписки |

Пояснения:

- Пополнение: фронт создаёт счёт, открывает `pay_url` и раз в 2 секунды спрашивает `GET /invoices/:id`,
  пока статус `UNPAID`. `amount` не меньше `min_amount` у способа оплаты.
- Покупка и продление: цену фронт показывает по формуле из `packages/shared/src/pricing.ts`
  (цена дня × устройства × дни × (1 − скидка за устройства) × (1 − max(персональная, общая))).
  Итог считает бэкенд и списывает с баланса. Не хватает денег — ошибка с `detail` «Недостаточно средств».
  Если подписка активна, покупка её продлевает.
- Подписки нет: `404`, пустой ответ или `status: "NOT_FOUND"` — фронт поймёт любой вариант.
- В `Subscription.slots` только неудалённые слоты (`is_deleted = false`).
- Почта: в `database.dbml` поля нет, его нужно добавить в `users`. Пока ручки нет, привязка в профиле покажет ошибку от бэкенда.

## Админ-панель

Все пути с префиксом `/admin`. Пускать только `OWNER`, `ADMIN` и `SUPPORT_AGENT`, для `USER` любой `/admin/*` — `403`.
`SUPPORT_AGENT` только смотрит: фронт прячет кнопки, но бэкенд тоже должен отвечать `403` на изменения.

| Метод и путь | Параметры / тело | Ответ |
|---|---|---|
| `GET /admin/me` | | `AdminMe` — id, tg_user_id, role |
| `GET /admin/dashboard` | `tz` | `Dashboard` |
| `GET /admin/users` | список + `role`, `flag` | `Paginated<AdminUserRow>` |
| `GET /admin/users/:id` | | `AdminUserDetails` |
| `GET /admin/users/:id/referrals` | список | `Paginated<ReferralRow>` |
| `GET /admin/users/:id/ledger` | `page`, `page_size` | `Paginated<LedgerEntry>`, новые сверху |
| `POST /admin/users/:id/balance` | `{ direction, amount, comment? }` | `AdminUserDetails` |
| `GET /admin/invoices` | список + `status`, `provider`, `user_id`, `from`, `to`, `date_by` | `Paginated<AdminInvoiceRow>` |
| `GET /admin/payment-methods` | | `PaymentMethod[]` — все, включая выключенные |
| `PATCH /admin/payment-methods/:id` | `{ name?, is_active?, min_amount? }` | `PaymentMethod` |
| `GET /admin/settings` | | `AdminSettings` |
| `PATCH /admin/settings` | `{ support_link?, invited_bonus?, referral_bonus? }` | `AdminSettings` |
| `GET /admin/stats/range` | | `StatsRange` |
| `GET /admin/stats/users` | статистика | `UsersStatsPoint[]` |
| `GET /admin/stats/deposits` | статистика | `DepositsStats` |
| `GET /admin/stats/purchases` | статистика | `PurchasesStatsPoint[]` |

### Списки

Параметры строки запроса: `page` (с 1), `page_size` (до 100), `sort`, `order` (`asc`/`desc`),
`q` — поиск. Ответ: `{ items, total, page, page_size }`, `total` — сколько записей под фильтром.

| Список | `q` ищет по | `sort` |
|---|---|---|
| пользователи | `id`, `tg_user_id` (точное число), `language_code` | `id`, `tg_user_id`, `registered_at`, `balance`, `subscription_expires_at`, `referrals_count` |
| рефералы пользователя | — | `id`, `invited_at`, `deposits_total` |
| счета | `id`, `user_id`, `tg_user_id` (точное число), `external_invoice_id` (вхождение) | `id`, `amount`, `created_at`, `paid_at` |

Период у счетов: `from`, `to` — ISO 8601 с поясом, полуинтервал `[from, to)`, любую границу можно
опустить; `date_by=created` (по умолчанию) — по `created_at`, `date_by=paid` — по `paid_at`
(неоплаченные не попадают). Админка шлёт границы суток браузера. «Зависшие» счета на главной —
`status=UNPAID&to=<сейчас − 1 ч>`: отдельной ручки не нужно.

Фильтр `flag` у пользователей: `bot` — `is_bot`; `blocked` — заблокировали бота;
`premium` — Telegram Premium; `trial` — пользовались пробной подпиской;
`active_sub` — подписка `ACTIVE` сейчас. Пустые значения сортировки (нет подписки) — в конце.

### Баланс

`POST /admin/users/:id/balance`: `direction: "IN"` — начисление (`ledger_entries.entry_type =
ADMIN_ADD`), `"OUT"` — списание (`ADMIN_DEDUCT`). `amount > 0`; списать больше баланса нельзя —
`422`. `comment` — в `audit_logs.comment`. Ответ — обновлённая карточка пользователя.

### Статистика

Запросы `/admin/stats/users|deposits|purchases` принимают:

| Параметр | Значение |
|---|---|
| `from`, `to` | ISO-даты, `to` не включается |
| `granularity` | `hour`, `day`, `month`, `year` |
| `tz` | часовой пояс IANA из браузера, например `Europe/Moscow` |

- Интервалы (час, день, месяц, год) считаются в поясе `tz`; `t` — начало интервала.
- Отдаются все интервалы подряд, пустые — с нулями.
- Фронт запрашивает весь период один раз (границы из `GET /admin/stats/range`), а при движении ползунка
  всё пересчитывает сам. Для `hour` берёт только последние 31 день.
- Последний интервал может быть неполным (текущий день, месяц), фронт помечает это сам.

Пользователи (`UsersStats`). Когда пользователь заблокировал бота или был помечен ботом,
в базе не хранится, поэтому по времени считаются только регистрации, а категории — по текущим
флагам. Категории не пересекаются, чтобы их можно было складывать: боты — все `is_bot`;
«заблокировали» — люди (не боты) с `is_blocked_bot`; активные = всего − заблокировали − боты.
- `now` — аудитория на момент запроса: `total`, `blocked`, `bots`;
- в точке `points`: `total` — всего зарегистрировано на конец интервала (накопительно),
  `new_total` — зарегистрировались в этом интервале, `new_blocked` и `new_bots` — сколько из
  них сейчас заблокировали бота и помечены ботами.

Пополнения (`DepositsStats`). Оплаченные счета (`status = PAID`) по `paid_at`, суммы — в рублях,
как они зачислены на баланс (`ledger_entries` с `entry_type = DEPOSIT`), а не в валюте счёта.
`total_before` — сумма всех пополнений до `from` (база накопительного графика).
В точке: `amount`, `count` и то же по способам оплаты в `by_provider`.

Покупки (`PurchasesStatsPoint`). Покупки по `created_at`: в `by_kind` — количество и сумма
по `purchases.kind`, `slots` — сколько слотов устройств куплено (`purchase_slots`).

### Сводка

`GET /admin/dashboard?tz=…` — числа для главной страницы; «сегодня» и «за 30 дней» — в поясе
`tz`. `daily` — последние 30 дней по дням, `latest_users` и `latest_invoices` — по 6 последних.
Фронтенд обновляет сводку раз в минуту.
