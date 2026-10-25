'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { isAppViewPathname } from '@lib/constants/cities'

/** Page body. Leaves room for the fixed site header, except in the native app's viewer (/{city}/app-view/…). */
export function SiteMain({ children }: { children: ReactNode }) {
  const appView = isAppViewPathname(usePathname())
  return <main className={appView ? 'flex flex-1 flex-col' : 'flex flex-1 flex-col pt-14 sm:pt-16'}>{children}</main>
}
