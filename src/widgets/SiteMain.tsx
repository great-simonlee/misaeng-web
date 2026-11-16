'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { isAppViewPathname } from '@lib/constants/cities'
import { communityForPath } from '@widgets/ellieo/communities'

/**
 * Page body. Leaves room for the fixed site header, except in the native app's viewer (/{city}/app-view/…).
 * Ellieo phones/tablets: Home and category pages also have the 44px category strip under the header.
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const href = useCityPath()
  const appView = isAppViewPathname(pathname)
  const ellieoStrip =
    BRAND_CONFIG.theme === 'ellieo' && (pathname === href() || Boolean(communityForPath(pathname, href)))
  return (
    <main
      data-strip={ellieoStrip || undefined}
      className={
        appView
          ? 'flex flex-1 flex-col'
          : cn('flex flex-1 flex-col', ellieoStrip ? 'pt-[6.25rem] lg:pt-16' : 'pt-14 sm:pt-16')
      }
    >
      {children}
    </main>
  )
}
