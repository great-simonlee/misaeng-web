'use client'

import { usePathname } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { isAppViewPathname, isCitySitePathname } from '@lib/constants/cities'
import { Navbar } from '@widgets/Navbar'
import { NycNavbar } from '@widgets/NycNavbar'

export function SiteHeader() {
  const pathname = usePathname()
  // Native app in-app viewer: document only
  if (isAppViewPathname(pathname)) return null
  // 회사 사이트가 없는 브랜드(ellieo)는 앱 소개 페이지도 서비스 헤더·푸터를 쓴다
  const isCitySite = isCitySitePathname(pathname) || !BRAND_CONFIG.hasCorporateSite

  if (isCitySite) {
    return <NycNavbar />
  }

  return <Navbar />
}
