'use client'

import { usePathname } from 'next/navigation'

import { CorporateFooter } from '@widgets/CorporateFooter'
import { NycFooter } from '@widgets/NycFooter'

export function SiteFooter() {
  const pathname = usePathname()
  const isNyc = pathname === '/nyc' || pathname.startsWith('/nyc/')

  if (isNyc) {
    return <NycFooter />
  }

  return <CorporateFooter />
}
