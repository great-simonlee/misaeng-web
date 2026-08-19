'use client'

import { usePathname } from 'next/navigation'

import { Navbar } from '@widgets/Navbar'
import { NycNavbar } from '@widgets/NycNavbar'

export function SiteHeader() {
  const pathname = usePathname()
  const isNyc = pathname === '/nyc' || pathname.startsWith('/nyc/')

  if (isNyc) {
    return <NycNavbar />
  }

  return <Navbar />
}
