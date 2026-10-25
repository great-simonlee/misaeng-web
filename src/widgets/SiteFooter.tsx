'use client'

import { usePathname } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { isAppViewPathname, isCitySitePathname } from '@lib/constants/cities'
import { AppDownloadBar, AppDownloadBarSpacer } from '@widgets/AppDownloadBar'
import { CorporateFooter } from '@widgets/CorporateFooter'
import { NycFooter } from '@widgets/NycFooter'

export function SiteFooter() {
  const pathname = usePathname()
  // Native app in-app viewer: document only
  if (isAppViewPathname(pathname)) return null
  // 회사 사이트가 없는 브랜드(ellieo)는 앱 소개 페이지도 서비스 헤더·푸터를 쓴다
  const isCitySite = isCitySitePathname(pathname) || !BRAND_CONFIG.hasCorporateSite

  if (isCitySite) {
    return <NycFooter />
  }

  // 회사 사이트: 하단에 Ellieo 앱 다운로드 바 (앱 소개 페이지 자체에서는 숨김)
  const showAppBar = BRAND_CONFIG.hasMobileAppPage && pathname !== '/mobile-app'
  return (
    <>
      <CorporateFooter />
      {showAppBar ? (
        <>
          <AppDownloadBarSpacer />
          <AppDownloadBar />
        </>
      ) : null}
    </>
  )
}
