# VPNHub — Telegram Mini App (дизайн-макет)

Фронтенд мини-аппа для управления VPN-подпиской. React + TypeScript + Vite.
Только интерфейс: данные демонстрационные (`app/src/data/mock.ts`), бэкенда нет.

## Запуск

```bash
cd app
npm install
npm run dev      # разработка
npm run build    # сборка в app/dist
```

## Хостинг

Выложить содержимое `app/dist/` на HTTPS-сервер, все пути отдавать через `index.html`
(для nginx: `try_files $uri /index.html;`). Привязка к боту:

```bash
BOT_TOKEN=... python3 app/scripts/set-menu-button.py https://your-domain.com
```

## Оформление

- Палитры (`?palette=graphite|telegram|neon`): `app/src/styles/palettes.css`.
- Эмодзи — Lottie из паков VHub Project и Toxic Emojis Mini. Оригиналы: `app/emoji-src/`,
  голубые версии генерирует `python3 app/scripts/recolor-emoji.py`.
