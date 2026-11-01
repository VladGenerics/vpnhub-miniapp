import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web/build/player/lottie_light'
import { emojiFolder } from '../lib/palette'
import { useApp } from '../store/AppStore'

/* Кэш загруженных анимаций: один fetch на файл, клон на каждый экземпляр
   (lottie-web мутирует переданный объект). */
const cache = new Map<string, Promise<unknown>>()

/* Сам плеер (~150 КБ) грузим отдельным файлом: первый экран рисуется,
   не дожидаясь его, а эмодзи проявляются, когда он готов. */
let player: Promise<typeof import('lottie-web/build/player/lottie_light').default> | null = null
const loadPlayer = () => (player ??= import('lottie-web/build/player/lottie_light').then((m) => m.default))

function load(path: string) {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`/${path}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    // Неудачную загрузку не кэшируем — следующий показ попробует ещё раз
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

export function preloadEmoji(folder: string, ...names: string[]) {
  loadPlayer()
  names.forEach((n) => load(`${folder}/${n}`))
}

/* Очередь инициализации: создание анимации тяжёлое (парсинг сотен КБ),
   поэтому разносим его по кадрам и стартуем после начала переходов —
   иначе подтормаживают навигация и анимации страниц. */
const queue: (() => void)[] = []
let pumping = false

function pump() {
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < 6) {
    // Битый файл анимации не должен останавливать очередь для остальных эмодзи
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

/* Все эмодзи крутятся по кругу, но те, что вне экрана, ставим на паузу —
   иначе десятки SVG-анимаций зря грузят процессор. */
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
  const folder = emojiFolder(useApp().palette)
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
    Promise.all([load(`${folder}/${name}`), loadPlayer()])
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
  }, [name, folder])

  return <div ref={box} className={`lottie ${ready ? 'is-ready' : ''} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden />
}
