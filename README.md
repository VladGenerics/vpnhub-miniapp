# VPNHub — фронтенд

Фронтенд VPN-сервиса в одном репозитории:

- **Кабинет пользователя** (`apps/miniapp`) — Telegram Mini App, который открывается и как
  обычный сайт в браузере (вход через Telegram). Подписка и устройства, покупка и продление,
  пополнение баланса, автопродление, профиль, статьи и помощь.
- **Админ-панель** (`apps/admin`) — сводка, пользователи (поиск, фильтры, сортировка,
  карточка с рефералами и операциями, начисление и списание баланса), счета, платёжные
  системы (вкл/выкл, переименование, минимальная сумма), статистика в стиле статистики
  Telegram-каналов, настройки проекта (ссылка на поддержку, реферальные бонусы).
- **Общий пакет** (`packages/shared`) — типы данных по `database.dbml`, контракт API,
  HTTP-клиент, расчёт цены, форматирование.

Без адреса API оба приложения работают на демо-данных — их можно смотреть до готовности бэкенда.
Контракт API для бэкенда — [docs/api.md](docs/api.md).

## Технологии

| | |
|---|---|
| Язык и UI | TypeScript, React 19 |
| Сборка | Vite 8, npm workspaces (монорепозиторий) |
| Маршрутизация | React Router 7 |
| Данные с сервера | TanStack Query 5 — кэш, повторы, фоновое обновление, плавная смена страниц списков |
| Графики админки | Apache ECharts 6 (только нужные модули, грузятся лишь на страницах статистики) |
| Анимированные эмодзи | lottie-web (облегчённый плеер, грузится отдельным файлом) |
| Telegram | Telegram Web Apps SDK (Mini App), Telegram Login Widget (вход на сайте) |
| Стили | Свой CSS на дизайн-токенах: светлая и тёмная тема, палитры кабинета, адаптив от 320 px |

UI-библиотек нет: компоненты написаны под утверждённый макет, зависимостей минимум.

## Структура

```
apps/
  miniapp/                 кабинет пользователя
    src/
      api/                 контракт API, HTTP-клиент, демо-данные (mock.ts), хуки запросов
      auth/                вход: initData в Telegram, токен на сайте
      components/          UI-компоненты (списки, шторки, переключатели, Lottie…)
      pages/               экраны: подписка, устройство, пополнение, профиль, статьи
      lib/ hooks/ store/   Telegram SDK, палитры, форматирование, состояние приложения
      styles/              глобальные стили и палитры
    public/emoji*/         анимации эмодзи (Lottie JSON)
    emoji-src/             исходники эмодзи для scripts/recolor-emoji.py
    scripts/               привязка к кнопке меню бота, перекраска эмодзи
  admin/                   админ-панель
    src/
      api/                 контракт API, HTTP-клиент, хуки запросов, демо-бэкенд (mock/)
      auth/                вход и проверка роли
      components/          таблица, бейджи, модальные окна, переключатели, макет страницы
      pages/               сводка, пользователи, счета, платёжные системы, настройки
      pages/statistics/    статистика: период, графики, круговые диаграммы
      styles/admin.css
packages/
  shared/src/              типы (types.ts — кабинет, admin.ts — админка), HTTP-клиент, цены
deploy/nginx.conf          nginx для раздачи собранных приложений
docs/api.md                контракт API
Dockerfile, docker-compose.yml
```

## Локальный запуск

Нужны Node.js 22 LTS и npm 10.

```bash
npm install
npm run dev:miniapp     # кабинет:   http://localhost:5173
npm run dev:admin       # админка:   http://localhost:5174
```

Проверки и сборка:

```bash
npm run typecheck       # проверка типов во всех пакетах
npm run build           # сборка обоих приложений в apps/*/dist
```

### Настройки

Переменные окружения читаются при сборке. Образцы — `apps/miniapp/.env.example` и
`apps/admin/.env.example`; скопируйте в `.env.local` рядом и заполните.

| Переменная | Где | Что задаёт |
|---|---|---|
| `VITE_API_URL` | оба | Адрес API, например `https://api.example.com/api` или `/api`. Не задан — демо-данные |
| `VITE_USE_MOCKS` | оба | `true` — демо-данные даже при заданном `VITE_API_URL` |
| `VITE_TG_BOT_ID` | оба | Числовой ID бота (часть токена до `:`) для входа через Telegram на сайте |
| `VITE_TG_BOT_USERNAME` | кабинет | Username бота без `@` — кнопка «Открыть в Telegram» на странице входа |
| `VITE_BASE_PATH` | админка | Путь, если админка на домене кабинета: `/admin/`. По умолчанию — корень |

### Демо-режим

- **Админка:** на странице входа выберите роль — «Владелец», «Админ» или «Поддержка»
  (у поддержки всё только для чтения). Данные сгенерированы за 14 месяцев, изменения живут до
  перезагрузки страницы.
- **Кабинет:** параметры адреса `?sub=0` — без подписки, `?expires=90` — подписка закончится
  через 90 секунд, `?palette=graphite|telegram|neon` — палитра.

### Проверка внутри Telegram

Telegram открывает Mini App только по HTTPS. Для разработки удобен туннель:

```bash
cloudflared tunnel --url http://localhost:5173
```

```bash
BOT_TOKEN=... python3 apps/miniapp/scripts/set-menu-button.py https://xxx.trycloudflare.com
```

## Продакшен

Оба приложения после сборки — статические файлы (`apps/*/dist`). Их можно отдать любым
веб-сервером: все пути, кроме файлов, должны отдавать `index.html`. Готовый конфиг nginx
с этим правилом, gzip и кэшированием — [deploy/nginx.conf](deploy/nginx.conf).

### Docker

```bash
cp .env.example .env    # заполнить VITE_API_URL, VITE_TG_BOT_ID, VITE_TG_BOT_USERNAME
docker compose up -d --build
```

Кабинет поднимется на `:8080`, админка — на `:8081` (порты меняются в `.env`). Внутри — nginx
со статикой; HTTPS завершается на внешнем прокси (nginx на хосте, Caddy, Traefik).
Переменные `VITE_*` вшиваются при сборке — после их смены нужно `docker compose up -d --build`.

Собрать один образ:

```bash
docker build --build-arg APP=admin --build-arg VITE_API_URL=https://api.example.com/api \
  --build-arg VITE_TG_BOT_ID=123456789 -t vpnhub-admin .
```

### Без Docker

```bash
npm ci
VITE_API_URL=https://api.example.com/api VITE_TG_BOT_ID=123456789 \
  VITE_TG_BOT_USERNAME=vpnhub_bot npm run build:miniapp
VITE_API_URL=https://api.example.com/api VITE_TG_BOT_ID=123456789 npm run build:admin
```

Содержимое `apps/miniapp/dist` и `apps/admin/dist` выложить на сервер и подключить
`deploy/nginx.conf` (поменять `root` на свою папку).

### Домены и Telegram

- Нужен HTTPS. Пример: кабинет — `app.example.com`, API — `app.example.com/api`
  (тогда `VITE_API_URL=/api` и CORS не нужен) или отдельный `api.example.com` с CORS.
- **Mini App:** ссылку на кабинет ставят кнопкой меню бота (скрипт выше) или в @BotFather.
- **Вход на сайте:** домен привязывается к боту в @BotFather → `/setdomain`. К боту
  привязывается **один** домен, поэтому админку удобно держать на домене кабинета по пути
  `/admin/` — для этого её собирают с `VITE_BASE_PATH=/admin/` (в compose — `ADMIN_BASE_PATH`).
  Пример nginx на хосте:

  ```nginx
  server {
      listen 443 ssl;
      server_name app.example.com;
      # ssl_certificate …

      location /api/   { proxy_pass http://127.0.0.1:8000; }   # бэкенд
      location = /admin { return 301 /admin/; }
      location /admin/ { proxy_pass http://127.0.0.1:8081/; } # админка, префикс срезается
      location /       { proxy_pass http://127.0.0.1:8080; }  # кабинет
  }
  ```

  Другой вариант — отдельный бот для входа в админку со своим доменом.

## Авторизация

- В Telegram — заголовок `Authorization: tma <initData>`, бэкенд проверяет подпись токеном бота.
- На сайте — Telegram Login Widget → `POST /auth/telegram` → токен в `localStorage`, дальше
  `Authorization: Bearer <token>`.
- В админку пускает только роли `OWNER`, `ADMIN` и `SUPPORT_AGENT` (`GET /admin/me`).
  Поддержка видит всё, но ничего не меняет.

Подробно — в [docs/api.md](docs/api.md).

## Оформление кабинета

- Палитры: `apps/miniapp/src/styles/palettes.css`.
- Эмодзи — Lottie из паков VHub Project и Toxic Emojis Mini. Оригиналы — `apps/miniapp/emoji-src/`,
  голубые версии генерирует `python3 apps/miniapp/scripts/recolor-emoji.py`.
- Витрины для проверки: `/ui` — компоненты, `/emoji` — все эмодзи.
