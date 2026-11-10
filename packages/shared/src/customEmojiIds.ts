// Кастомные эмодзи Telegram (custom_emoji_id) -> анимированный эмодзи приложения (имя файла в public/emoji).
// Если ID здесь есть, <tg-emoji emoji-id="..."> в разделах и поле «Эмодзи» показываются анимацией из приложения,
// если нет - обычным символом, который указан внутри тега.
//
// Заполняется скриптом по паку бота (нужен токен бота):
//   BOT_TOKEN=123:abc node apps/miniapp/scripts/emoji-ids.mjs
// Можно дописать и руками: '5368324170671202286': 'VHubProject_18'
export const CUSTOM_EMOJI_IDS: Record<string, string> = {}
