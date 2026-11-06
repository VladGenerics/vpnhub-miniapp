# VPNHub - фронтенд

- `apps/miniapp` - кабинет пользователя (Telegram Mini App и сайт)
- `apps/admin` - админка
- `packages/shared` - общие типы и HTTP-клиент

React 19, TypeScript, Vite, TanStack Query, ECharts. Нужен Node.js 22.12+.

## Запуск

```bash
npm install
npm run dev:miniapp   # кабинет  http://localhost:5173
npm run dev:admin     # админка  http://localhost:5174
npm run build         # сборка в apps/*/dist
```

Без `VITE_API_URL` в `npm run dev` работает на тестовых данных.

## Подключение API

Бэкенд реализует ручки из [docs/api.md](docs/api.md). Адреса задаются в `.env` (образец `.env.example`):

```env
VITE_API_URL=/api
VITE_TG_BOT_ID=123456789          # цифры из токена бота до двоеточия
VITE_TG_BOT_USERNAME=vpnhub_bot   # для кабинета
```

Домен сайта привязать к боту: @BotFather → `/setdomain`. После изменения `.env` нужна пересборка.

## Деплой

```bash
cp .env.example .env
docker compose up -d --build
```

Кабинет на `:8080`, админка на `:8081`, HTTPS на внешнем прокси. Пример nginx - [deploy/nginx.conf](deploy/nginx.conf).
Админку можно держать на домене кабинета по пути `/admin/` (`ADMIN_BASE_PATH=/admin/` в `.env`).

## Демо без бэкенда

`VITE_USE_MOCKS=true` в `.env` - кабинет и админка на тестовых данных. В кабинете справа сверху кнопка с ползунками: переключает подписку, срок, баланс, слоты и неоплаченные счета.
