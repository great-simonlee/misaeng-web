'use client'

import { usePathname } from 'next/navigation'

import { isCitySitePathname } from '@lib/constants/cities'
import { Navbar } from '@widgets/Navbar'
import { NycNavbar } from '@widgets/NycNavbar'

export function SiteHeader() {
  const pathname = usePathname()
  const isCitySite = isCitySitePathname(pathname)

  if (isCitySite) {
    return <NycNavbar />
  }

  return <Navbar />
}
