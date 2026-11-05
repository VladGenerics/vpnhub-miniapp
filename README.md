# VPNHub - фронтенд

- `apps/miniapp` - кабинет пользователя. Работает как Telegram Mini App и как обычный сайт (вход через Telegram).
- `apps/admin` - админка: обзор, пользователи, счета, платёжные системы, статистика, настройки.
- `packages/shared` - общие типы, HTTP-клиент, расчёт цены.

Без бэкенда приложения можно запустить на тестовых данных в памяти (раздел «Тестовые данные» ниже). В боевой сборке они включаются только явно.

Стек: React 19, TypeScript, Vite 8, TanStack Query, React Router, ECharts (графики админки), lottie-web (эмодзи). UI-библиотек нет, стили свои.

## Запуск

Нужен Node.js 22.12 или новее (этого требует Vite 8) и npm 10.

```bash
npm install
npm run dev:miniapp   # кабинет  http://localhost:5173
npm run dev:admin     # админка  http://localhost:5174
```

```bash
npm run typecheck
npm run format        # prettier
npm run build         # обе сборки в apps/*/dist
```

## Подключение своего API

1. Бэкенд реализует ручки из [docs/api.md](docs/api.md). Там пути, тела запросов и ответы, типы лежат в `packages/shared/src/types.ts` и `admin.ts`.
   Если у вас пути или поля другие, поправьте один файл: `apps/miniapp/src/api/index.ts` или `apps/admin/src/api/index.ts`.
2. Укажите адрес API и бота:
   - локально - в `apps/miniapp/.env.local` и `apps/admin/.env.local` (образцы - `.env.example` рядом);
   - в Docker - в `.env` в корне (`cp .env.example .env`).

   ```env
   VITE_API_URL=https://api.example.com/api
   VITE_TG_BOT_ID=123456789          # цифры из токена бота до двоеточия
   VITE_TG_BOT_USERNAME=vpnhub_bot   # только для кабинета
   ```

3. Если API на другом домене, включите на бэкенде CORS (см. docs/api.md).
   Проще держать API на том же домене по пути `/api`, тогда `VITE_API_URL=/api` и CORS не нужен.
   Для локальной разработки есть прокси: `VITE_API_URL=/api` и `API_PROXY=http://localhost:8000` в `.env.local`.
4. Привяжите домен сайта к боту: @BotFather → `/setdomain`. Без этого вход через Telegram на сайте не откроется.
5. Пересоберите. Переменные `VITE_*` вшиваются при сборке, после изменения нужен новый билд.

Проверка: открыть сайт → «Войти через Telegram» → должен открыться кабинет с вашими данными. Дальше пополнение, покупка и «Продлить» - после каждого баланс и срок подписки должны совпасть с базой. В админку пустит только роли `OWNER`, `ADMIN` и `SUPPORT_AGENT`, остальным будет «Нет доступа».

Ошибки бэкенда показываются пользователю как есть из поля `detail` (формат FastAPI) или `message`, так что пишите их по-русски.

## Переменные

| Переменная | Где | Зачем |
|---|---|---|
| `VITE_API_URL` | оба | Адрес API, например `/api` |
| `VITE_TG_BOT_ID` | оба | ID бота для входа через Telegram на сайте |
| `VITE_TG_BOT_USERNAME` | кабинет | Username бота без `@`, кнопка «Открыть в Telegram» |
| `VITE_BASE_PATH` | админка | Путь, если админка на домене кабинета: `/admin/`. В compose это `ADMIN_BASE_PATH` |
| `VITE_USE_MOCKS` | оба | `true` - тестовые данные вместо API (для проверки без бэкенда) |
| `API_PROXY` | оба, dev | Куда проксировать `/api` в `npm run dev` |

## Деплой

### Docker

```bash
cp .env.example .env   # заполнить
docker compose up -d --build
```

Кабинет поднимется на `:8080`, админка на `:8081` (порты меняются в `.env`). Внутри nginx со статикой, HTTPS ставится на внешнем прокси.
Порты слушают только `127.0.0.1`, чтобы снаружи ходили через прокси с HTTPS. Нужен прямой доступ - `BIND_ADDR=0.0.0.0` в `.env`.
Если `VITE_API_URL=/api`, а прокси на бэкенд не настроен, nginx контейнера ответит на `/api/...` ошибкой 502 с понятным текстом, а не страницей сайта.

### Без Docker

```bash
npm ci
VITE_API_URL=https://api.example.com/api VITE_TG_BOT_ID=123456789 VITE_TG_BOT_USERNAME=vpnhub_bot npm run build:miniapp
VITE_API_URL=https://api.example.com/api VITE_TG_BOT_ID=123456789 npm run build:admin
```

Папки `apps/miniapp/dist` и `apps/admin/dist` выложить на сервер. Конфиг nginx - [deploy/nginx.conf](deploy/nginx.conf), там поменять `root`. Главное правило: все неизвестные пути отдают `index.html`.

### Домены

К боту привязывается только один домен, поэтому админку удобно держать на домене кабинета по пути `/admin/` (сборка с `VITE_BASE_PATH=/admin/`). Пример nginx на хосте:

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;
    # ssl_certificate ...

    location /api/   { proxy_pass http://127.0.0.1:8000; }   # бэкенд
    location = /admin { return 301 /admin/; }
    location /admin/ { proxy_pass http://127.0.0.1:8081/; }  # админка, префикс срезается
    location /       { proxy_pass http://127.0.0.1:8080; }   # кабинет
}
```

Mini App в боте: ссылку на кабинет ставят в @BotFather или скриптом:

```bash
BOT_TOKEN=... python3 apps/miniapp/scripts/set-menu-button.py https://app.example.com
```

## Авторизация

- Внутри Telegram каждый запрос идёт с `Authorization: tma <initData>`, бэкенд проверяет подпись токеном бота.
- На сайте: Telegram Login Widget → `POST /auth/telegram` → токен. Дальше `Authorization: Bearer <token>`. Токен лежит в `localStorage`, на `401` фронт выкидывает на вход.
- Админка спрашивает `GET /admin/me`. Поддержка (`SUPPORT_AGENT`) видит только раздел «Пользователи» и ничего не меняет.

## Тестовые данные

Включаются сами в `npm run dev`, если не задан `VITE_API_URL`, а в сборке - только с `VITE_USE_MOCKS=true`. Данные живут в памяти до перезагрузки страницы, вход без окна Telegram (если не задан `VITE_TG_BOT_ID`).

- Админка: данные за 14 месяцев, вход владельцем. Режим поддержки: `localStorage['vpnhub.admin.mock-role'] = 'SUPPORT_AGENT'` и войти заново.
- Кабинет: `?sub=0` - без подписки, `?expires=90` - подписка кончится через 90 секунд.
- Пополнение открывает страницу-заглушку оплаты `/test-pay` в новой вкладке: «Оплатить» или «Отклонить платёж», потом в кабинете «Проверить оплату». Несколько неоплаченных счетов есть сразу, чтобы было видно раздел «Неоплаченные счета».

## Проверка в Telegram

Telegram открывает Mini App только по HTTPS, локально удобно через туннель:

```bash
cloudflared tunnel --url http://localhost:5173
```

и поставить полученный адрес кнопкой меню бота скриптом выше.

## Где что лежит

```
apps/miniapp/src/
  api/          запросы (index.ts), тестовые данные (mock.ts), хуки (queries.ts)
  auth/         вход: initData или токен
  pages/        экраны
  components/   компоненты
  styles/       стили и палитры
apps/admin/src/
  api/          запросы (index.ts), тестовые данные (mock/), хуки (queries.ts)
  auth/         вход и проверка роли
  pages/        разделы, статистика в pages/statistics
packages/shared/src/
  types.ts      типы кабинета
  admin.ts      типы админки
  http.ts       HTTP-клиент
docs/api.md     контракт API
deploy/         nginx
```

Эмодзи - Lottie из паков VHub Project и Toxic Emojis Mini (`apps/miniapp/public/emoji*`). Файлы в формате `.lottie` (dotLottie, zip с json внутри, в 15-20 раз легче голого json). У «Графита» и «Telegram» эмодзи голубые (`public/emoji`), у «Неона» родные зелёные (`public/emoji-original`), у своего цвета родные перекрашиваются в браузере в оттенок акцента (`src/lib/recolorEmoji.ts`). Голубые версии и `.lottie` из исходников `emoji-src/` делает `python3 apps/miniapp/scripts/recolor-emoji.py`. Все эмодзи можно посмотреть на `/emoji` (только в `npm run dev`, там же на `/ui` витрина компонентов).
