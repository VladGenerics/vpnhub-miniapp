// Эмодзи из паков VHub Project (V) и Toxic Emojis Mini (T), Lottie JSON в public/emoji
const V = (n: number) => `VHubProject_${String(n).padStart(2, '0')}`
const T = (n: number) => `toxicemojismini_${String(n).padStart(2, '0')}`

export const E = {
  globe: V(0),
  warning: V(1),
  gear: V(2),
  chat: V(3),
  link: V(4),
  wave: V(5),
  medal: V(6),
  vCircle: V(7),
  catLaptop: V(8),
  signal: V(9),
  gift: V(11),
  phone: V(12),
  handshake: V(14),
  bell: V(15),
  vDiamond: V(16),
  vTile: V(17),
  rocket: V(18),
  check: V(19),
  megaphoneTile: V(20),
  giftTile: V(21),
  cardTile: V(22),
  bulbTile: V(23),
  vLogo: V(24),
  gearTile: V(25),
  dollarTile: V(26),
  questionTile: V(27),
  renewTile: V(28),
  walletTile: V(29),
  upTile: V(30),

  cool: T(21),
  starEyes: T(27),
  money: T(34),
  thumbsUp: T(47),
  memo: T(66),
  bulb: T(68),
  teacher: T(70),
  mail: T(72),
  sponge: T(74),
  sparkles: T(82),
  // звезда Telegram Stars из пака CryptoBot Assets: свои цвета, палитра её не перекрашивает (public/emoji-fixed)
  tgStar: 'cryptobot_star',
  // способы оплаты: анимированные эмодзи из паков Finance Emoji и Russian Banks (логотип СБП)
  payCard: 'pay_card',
  payCrypto: 'pay_usdt',
  paySbp: 'pay_sbp',
  fire: T(83),
  diamond: T(84),
  party: T(91),
  laptopGirl: T(95),
} as const

/** Пул для случайного эмодзи на главной без подписки */
export const HERO_POOL = [E.globe, E.medal, E.vCircle, E.catLaptop, E.signal, E.gift, E.phone, E.vDiamond, E.rocket]

/** Эмодзи со своими цветами: лежат в public/emoji-fixed, одинаковые во всех палитрах */
export const FIXED_EMOJI = new Set<string>([E.tgStar, E.payCard, E.payCrypto, E.paySbp])
