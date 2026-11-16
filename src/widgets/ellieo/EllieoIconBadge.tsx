import type { ComponentType, CSSProperties } from 'react'

import { cn } from '@lib'

type LineIcon = ComponentType<{ className?: string; strokeWidth?: number; style?: CSSProperties }>

/**
 * Ellieo hero mark for empty states, sheet heroes and composer headers (docs/design/ellieo-social.md):
 * an outline line icon in brand blue inside a soft blue circle (64px circle, 28px icon by default). No emoji.
 */
export function EllieoIconBadge({ icon: Icon, size = 64, className }: { icon: LineIcon; size?: number; className?: string }) {
  const iconSize = Math.round(size * 0.44)
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#1f5eff]', className)}
      style={{ width: size, height: size }}
    >
      <Icon strokeWidth={1.75} style={{ width: iconSize, height: iconSize }} />
    </span>
  )
}
