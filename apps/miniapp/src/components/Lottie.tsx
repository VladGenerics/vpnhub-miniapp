import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web/build/player/lottie_light'
import { strFromU8, unzipSync } from 'fflate'
import { FIXED_EMOJI } from '../data/emoji'
import { emojiSource } from '../lib/palette'
import { recolorEmoji } from '../lib/recolorEmoji'
import { useApp } from '../store/AppStore'

// Эмодзи лежат в формате .lottie (dotLottie): zip с manifest.json и animations/<id>.json.
// Распаковываем сами и отдаём json в lottie-web.
function readDotLottie(buf: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(buf))
  let id: string | undefined
  try {
    id = JSON.parse(strFromU8(files['manifest.json'])).animations?.[0]?.id
  } catch {
    /* манифеста нет - берём первую анимацию */
  }
  const file = (id && files[`animations/${id}.json`]) || Object.entries(files).find(([k]) => k.startsWith('animations/') && k.endsWith('.json'))?.[1]
  if (!file) throw new Error('в .lottie нет анимации')
  return JSON.parse(strFromU8(file))
}

// кэш анимаций: один fetch на файл, каждому экземпляру клон (lottie-web мутирует объект)
const cache = new Map<string, Promise<unknown>>()

// плеер (~150 КБ) грузим отдельно: первый экран не ждёт его, эмодзи проявляются позже
let player: Promise<typeof import('lottie-web/build/player/lottie_light').default> | null = null
// чанк плеера мог не скачаться (обрыв сети, новый релиз), тогда при следующем эмодзи пробуем снова
const loadPlayer = () =>
  (player ??= import('lottie-web/build/player/lottie_light').then(
    (m) => m.default,
    (e) => {
      player = null
      throw e
    },
  ))

function load(path: string) {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${path}.lottie`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return readDotLottie(await r.arrayBuffer())
    })
    // ошибку не кэшируем, в следующий раз попробуем снова
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

// перекрашенные под свой цвет: файл качается один раз, перекраска на каждый оттенок.
// Держим только последний оттенок, старые варианты больше не нужны
const tinted = new Map<string, Promise<unknown>>()
let lastTint = ''

function loadTinted(path: string, tint: string) {
  if (!tint) return load(path)
  if (tint !== lastTint) {
    tinted.clear()
    lastTint = tint
  }
  let p = tinted.get(path)
  if (!p) {
    const [hue, sat] = tint.split(',').map(Number)
    p = load(path).then((data) => recolorEmoji(structuredClone(data), hue, sat))
    p.catch(() => tinted.delete(path))
    tinted.set(path, p)
  }
  return p
}

export function preloadEmoji({ folder, tint }: { folder: string; tint: string }, ...names: string[]) {
  // предзагрузка не обязана удаться: при ошибке плеер попробует загрузиться ещё раз при показе эмодзи
  loadPlayer().catch(() => {})
  names.forEach((n) => loadTinted(`${folder}/${n}`, tint).catch(() => {}))
}

/** Пока тянут ползунок цвета, эмодзи не пересоздаём на каждый шаг, ждём паузу */
function useSettled(value: string, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// Создание анимации тяжёлое (парсинг сотен КБ), поэтому разносим его по кадрам
// и начинаем после переходов, иначе подтормаживает навигация.
const queue: (() => void)[] = []
let pumping = false

function pump() {
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < 6) {
    // битый файл не должен останавливать остальные эмодзи
    try {
      queue.shift()!()
    } catch (e) {
      console.warn('Lottie:', e)
    }
  }
  if (queue.length) requestAnimationFrame(() => setTimeout(pump, 0))
  else pumping = false
}

function schedule(job: () => void) {
  queue.push(job)
  if (!pumping) {
    pumping = true
    setTimeout(pump, 90)
  }
}

// эмодзи вне экрана ставим на паузу, иначе десятки анимаций зря грузят процессор
const visible = new WeakMap<Element, (inView: boolean) => void>()
const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((entries) => entries.forEach((e) => visible.get(e.target)?.(e.isIntersecting)), { rootMargin: '80px' })
    : null

interface Props {
  name: string
  size?: number
  className?: string
}

export function Lottie({ name, size = 28, className }: Props) {
  const { palette, accent } = useApp()
  const src = emojiSource(palette, accent)
  const own = FIXED_EMOJI.has(name)
  const folder = own ? 'emoji-fixed' : src.folder
  const tint = useSettled(own ? '' : src.tint)
  const box = useRef<HTMLDivElement>(null)
  const anim = useRef<AnimationItem | null>(null)
  const inView = useRef(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el || !observer) return
    visible.set(el, (v) => {
      inView.current = v
      if (v) anim.current?.play()
      else anim.current?.pause()
    })
    observer.observe(el)
    return () => {
      observer.unobserve(el)
      visible.delete(el)
    }
  }, [])

  useEffect(() => {
    let disposed = false
    setReady(false)
    Promise.all([loadTinted(`${folder}/${name}`, tint), loadPlayer()])
      .then(([data, lottie]) =>
        schedule(() => {
          if (disposed || !box.current) return
          try {
            anim.current = lottie.loadAnimation({
              container: box.current,
              renderer: 'svg',
              loop: true,
              autoplay: inView.current,
              animationData: structuredClone(data),
              rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
            })
          } catch (e) {
            console.warn(`Lottie: не удалось показать ${folder}/${name}`, e)
            box.current.replaceChildren()
            return
          }
          anim.current.addEventListener('DOMLoaded', () => !disposed && setReady(true))
        }),
      )
      .catch((e) => console.warn(`Lottie: не загрузился ${folder}/${name}`, e))
    return () => {
      disposed = true
      anim.current?.destroy()
      anim.current = null
    }
  }, [name, folder, tint])

  return <div ref={box} className={`lottie ${ready ? 'is-ready' : ''} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden />
}
