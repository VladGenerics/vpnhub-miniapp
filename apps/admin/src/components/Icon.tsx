import { ICONS, type IconName } from './icons'

/** SVG-иконка из набора Lucide; цвет — currentColor */
export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      // разметка иконок статична и лежит в бандле — внешних данных здесь нет
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
