import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web/build/player/lottie_light'
import { strFromU8, unzipSync } from 'fflate'
import { FIXED_EMOJI_FILES } from '@vpnhub/shared'

// Те же .lottie, что в кабинете (копируются из apps/miniapp/public, см. vite.config.ts)

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

// один запрос на файл, каждому экземпляру - клон (lottie-web мутирует объект)
const cache = new Map<string, Promise<unknown>>()
function load(name: string) {
  const folder = FIXED_EMOJI_FILES.includes(name) ? 'emoji-fixed' : 'emoji'
  const path = `${import.meta.env.BASE_URL}${folder}/${name}.lottie`
  let p = cache.get(path)
  if (!p) {
    p = fetch(path).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return readDotLottie(await r.arrayBuffer())
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

// плеер (~150 КБ) - отдельным чанком, только когда на странице есть эмодзи
let player: Promise<typeof import('lottie-web/build/player/lottie_light').default> | null = null
const loadPlayer = () =>
  (player ??= import('lottie-web/build/player/lottie_light').then(
    (m) => m.default,
    (e) => {
      player = null
      throw e
    },
  ))

// ленивая загрузка, в пикере их больше сотни
const visible = new WeakMap<Element, () => void>()
const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return
            visible.get(e.target)?.()
            observer?.unobserve(e.target)
          }),
        { rootMargin: '120px' },
      )
    : null

/** animate: true - всегда, 'hover' - при наведении на .lottie-hover, false - статичный кадр */
export function Lottie({ name, size = 28, animate = 'hover', className }: { name: string; size?: number; animate?: boolean | 'hover'; className?: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const anim = useRef<AnimationItem | null>(null)
  const [inView, setInView] = useState(!observer)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el || !observer) return
    visible.set(el, () => setInView(true))
    observer.observe(el)
    return () => {
      observer.unobserve(el)
      visible.delete(el)
    }
  }, [])

  useEffect(() => {
    if (!inView) return
    let disposed = false
    setReady(false)
    Promise.all([load(name), loadPlayer()])
      .then(([data, lottie]) => {
        if (disposed || !box.current) return
        anim.current = lottie.loadAnimation({
          container: box.current,
          renderer: 'svg',
          loop: true,
          autoplay: animate === true,
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        })
        // первый кадр у многих пустой, берём середину
        const a = anim.current
        const showPoster = () => {
          if (animate !== true) a.goToAndStop(Math.floor(a.totalFrames / 2), true)
          if (!disposed) setReady(true)
        }
        if (a.isLoaded) showPoster()
        else a.addEventListener('DOMLoaded', showPoster)
      })
      .catch((e) => console.warn(`Lottie: не загрузился ${name}`, e))
    return () => {
      disposed = true
      anim.current?.destroy()
      anim.current = null
    }
  }, [name, inView, animate === true])

  // оживает при наведении на строку/кнопку вокруг
  useEffect(() => {
    if (animate !== 'hover' || !ready) return
    const host = box.current?.closest('.lottie-hover')
    if (!host) return
    const on = () => anim.current?.play()
    const off = () => anim.current?.goToAndStop(Math.floor(anim.current.totalFrames / 2), true)
    host.addEventListener('mouseenter', on)
    host.addEventListener('mouseleave', off)
    return () => {
      host.removeEventListener('mouseenter', on)
      host.removeEventListener('mouseleave', off)
    }
  }, [animate, ready])

  return <span ref={box} className={`lottie ${ready ? 'is-ready' : ''} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden />
}
