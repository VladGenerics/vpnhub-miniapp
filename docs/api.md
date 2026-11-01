# API для фронтенда VPNHub

Контракт, по которому работают кабинет (`apps/miniapp`) и админ-панель (`apps/admin`).
Типы ответов описаны в TypeScript: [`packages/shared/src/types.ts`](../packages/shared/src/types.ts)
(кабинет) и [`packages/shared/src/admin.ts`](../packages/shared/src/admin.ts) (админка) — это
первоисточник, здесь — пояснения к ним. Демо-реализация всех эндпоинтов, по которой видно
ожидаемое поведение: `apps/miniapp/src/api/mock.ts` и `apps/admin/src/api/mock/`.

Если бэкенд отдаёт поля или пути иначе, правится один файл — `apps/*/src/api/index.ts`.

## Общие правила

- Базовый адрес задаёт `VITE_API_URL`, например `https://api.example.com/api`; пути ниже — от него.
- Тела запросов и ответов — JSON. Имена полей — как колонки в `database.dbml` (snake_case).
- Деньги — число в рублях (`1234.5`). Доли скидок — число от 0 до 1.
- Даты — строки ISO 8601 с часовым поясом (`2026-11-01T09:30:00Z`).
- Ошибка — любой не-2xx код с телом `{ "detail": "Текст для человека" }` (формат FastAPI)
  или `{ "message": "..." }`. Текст показывается пользователю как есть.
  Коды, на которые фронтенд реагирует особо: `401` — сессия на сайте истекла (токен
  сбрасывается, открывается вход), `403` — нет прав, `404` — запись не найдена,
  `422` — ошибка в данных.
- Ответ без тела — `204`.

### CORS

Если API на другом домене, разрешите происхождения кабинета и админки, методы
`GET, POST, PUT, PATCH, DELETE`, заголовки `Authorization, Content-Type`. Куки не используются.

## Авторизация

Один и тот же бот и одна схема для кабинета и админки.

**Внутри Telegram** каждый запрос несёт заголовок

```
Authorization: tma <initData>
```

`initData` — строка `Telegram.WebApp.initData`. Бэкенд проверяет подпись токеном бота
([алгоритм](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app))
и свежесть `auth_date`, пользователя берёт из поля `user`. Если пользователя ещё нет — регистрирует.

**В браузере** вход через Telegram Login Widget:

`POST /auth/telegram` — тело `TelegramLoginRequest`:

```json
{ "id": 123456789, "first_name": "Иван", "username": "ivan", "photo_url": "https://…",
  "auth_date": 1793500000, "hash": "…", "ref": "promo2026" }
```

Бэкенд проверяет `hash` ([алгоритм](https://core.telegram.org/widgets/login#checking-authorization)),
при первом входе регистрирует пользователя (`ref` — код `ref_links.code` или ID пригласившего,
необязателен) и возвращает `{ "token": "…" }`. Дальше запросы идут с заголовком
`Authorization: Bearer <token>`. Срок жизни токена — на усмотрение бэкенда; по `401` фронтенд
просит войти заново.

Для виджета домен сайта привязывается к боту: @BotFather → `/setdomain`.

## Кабинет пользователя

| Метод и путь | Тело | Ответ |
|---|---|---|
| `POST /auth/telegram` | `TelegramLoginRequest` | `AuthResponse` |
| `GET /me` | | `Me` — пользователь и баланс кошелька |
| `GET /subscription` | | `Subscription`; подписки нет — `404` или `status: "NOT_FOUND"` |
| `GET /tariffs` | | `Tariffs` — цены, скидки за устройства, общая и персональная скидка |
| `GET /payment-methods` | | `PaymentMethod[]` — **только включённые**, по `sequence_number` |
| `GET /settings` | | `PublicSettings` — ссылка на поддержку и размеры реф. бонусов |
| `POST /invoices` | `{ provider, amount }` | `Invoice` с `pay_url` |
| `GET /invoices/:id` | | `Invoice` |
| `POST /subscription/purchase` | `{ days, devices }` | `Subscription` после покупки |
| `PUT /subscription/auto-renewal` | `{ is_enabled, days }` | `AutoRenewal` |
| `POST /subscription/slots/:id/release` | | `204` — отвязать устройство, слот остаётся |
| `DELETE /subscription/slots/:id` | | `204` — удалить слот из подписки |

Пояснения:

- **Пополнение.** Фронтенд создаёт счёт, открывает `pay_url` и каждые 2 секунды запрашивает
  `GET /invoices/:id`, пока статус `UNPAID`. `amount` не меньше `min_amount` способа оплаты.
- **Покупка и продление.** Цену фронтенд показывает по формуле из
  `packages/shared/src/pricing.ts`: цена дня (`prices` по длительности) × устройства × дни ×
  (1 − скидка за устройства) × (1 − max(персональная, общая скидка)). Итог бэкенд считает
  сам и списывает с баланса; не хватает денег — ошибка с `detail` «Недостаточно средств».
  Есть активная подписка — покупка продлевает её.
- **Слоты.** В `Subscription.slots` — слоты без удалённых (`is_deleted`).

## Админ-панель

Все пути с префиксом `/admin`. Доступ — у ролей `OWNER`, `ADMIN` и `SUPPORT_AGENT`;
для `USER` любой `/admin/*` отвечает `403`. `SUPPORT_AGENT` — только чтение: фронтенд прячет
кнопки изменения, но бэкенд тоже должен отвечать `403` на изменяющие запросы.

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
- Отдаются **все интервалы подряд**, пустые — с нулями.
- Фронтенд запрашивает весь доступный период один раз (по `GET /admin/stats/range`),
  а окно графиков, итоги и круговые диаграммы пересчитывает у себя — без запросов при
  движении ползунка. Для `hour` запрашиваются только последние 31 день.
- Последний интервал может быть неполным (текущий день или месяц) — фронтенд это помечает сам.

**Пользователи** (`UsersStats`). Когда пользователь заблокировал бота или был помечен ботом,
в базе не хранится, поэтому по времени считаются только регистрации, а категории — по текущим
флагам. Категории не пересекаются, чтобы их можно было складывать: боты — все `is_bot`;
«заблокировали» — люди (не боты) с `is_blocked_bot`; активные = всего − заблокировали − боты.
- `now` — аудитория на момент запроса: `total`, `blocked`, `bots`;
- в точке `points`: `total` — всего зарегистрировано на конец интервала (накопительно),
  `new_total` — зарегистрировались в этом интервале, `new_blocked` и `new_bots` — сколько из
  них сейчас заблокировали бота и помечены ботами.

**Пополнения** (`DepositsStats`). Оплаченные счета (`status = PAID`) по `paid_at`, суммы — в рублях,
как они зачислены на баланс (`ledger_entries` с `entry_type = DEPOSIT`), а не в валюте счёта.
`total_before` — сумма всех пополнений до `from` (база накопительного графика).
В точке: `amount`, `count` и то же по способам оплаты в `by_provider`.

**Покупки** (`PurchasesStatsPoint`). Покупки по `created_at`: в `by_kind` — количество и сумма
по `purchases.kind`, `slots` — сколько слотов устройств куплено (`purchase_slots`).

### Сводка

`GET /admin/dashboard?tz=…` — числа для главной страницы; «сегодня» и «за 30 дней» — в поясе
`tz`. `daily` — последние 30 дней по дням, `latest_users` и `latest_invoices` — по 6 последних.
Фронтенд обновляет сводку раз в минуту.
