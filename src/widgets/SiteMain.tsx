'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { isAppViewPathname } from '@lib/constants/cities'
import { EllieoBoardChips } from '@widgets/ellieo/EllieoBoardChips'

/** Page body. Leaves room for the fixed site header, except in the native app's viewer (/{city}/app-view/…). */
export function SiteMain({ children }: { children: ReactNode }) {
  const appView = isAppViewPathname(usePathname())
  return (
    <main className={appView ? 'flex flex-1 flex-col' : 'flex flex-1 flex-col pt-14 sm:pt-16'}>
      {/* Ellieo: emoji board chips under the top bar on the home and board lists */}
      {!appView && BRAND_CONFIG.theme === 'ellieo' ? <EllieoBoardChips /> : null}
      {children}
    </main>
  )
}
