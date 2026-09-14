'use client'

import { usePathname } from 'next/navigation'

import { isCitySitePathname } from '@lib/constants/cities'
import { CorporateFooter } from '@widgets/CorporateFooter'
import { NycFooter } from '@widgets/NycFooter'

export function SiteFooter() {
  const pathname = usePathname()
  const isCitySite = isCitySitePathname(pathname)

  if (isCitySite) {
    return <NycFooter />
  }

  return <CorporateFooter />
}
