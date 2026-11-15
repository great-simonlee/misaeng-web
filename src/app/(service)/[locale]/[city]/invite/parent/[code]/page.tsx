import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { getT } from '@lib/i18n/server'
import { isLocale } from '@lib/i18n/locales'
import { BRAND_CONFIG } from '@lib/brand'
import { shareMetadata } from '@lib/share/shareMetadata'
import { ParentInviteScreen } from '@screens/nyc/ParentInviteScreen'

type ParentInvitePageProps = {
  params: Promise<{ locale: string; city: string; code: string }>
}

// 카카오톡 등 링크 미리보기: "자녀의 미국 생활, 미생에서 함께" 이미지 (public/og/share-parent.png)
export async function generateMetadata({ params }: ParentInvitePageProps): Promise<Metadata> {
  const { locale, city, code } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'common')
  return {
    ...(await shareMetadata('parentInvite', locale, {
      path: `/${city}/invite/parent/${code}`,
      description: t('share.parentInviteDescription'),
    })),
    robots: { index: false, follow: false },
  }
}

export default async function ParentInvitePage({ params }: ParentInvitePageProps) {
  const { code } = await params
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <ParentInviteScreen code={code} />
    </Suspense>
  )
}
