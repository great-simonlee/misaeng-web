import { createElement } from 'react'

import type { EllieoCommunity } from '@widgets/ellieo/communities'

/** Round community icon: community color + white line icon (docs/design/ellieo-community.md) */
export function EllieoCommunityAvatar({ community, size = 32 }: { community: EllieoCommunity; size?: number }) {
  return (
    <span
      aria-hidden
      className='inline-flex shrink-0 items-center justify-center rounded-full text-white'
      style={{ width: size, height: size, background: community.color }}
    >
      {createElement(community.icon, {
        className: 'shrink-0',
        strokeWidth: 2,
        // icon ~55% of the circle
        ...({ style: { width: Math.round(size * 0.55), height: Math.round(size * 0.55) } } as object),
      })}
    </span>
  )
}
