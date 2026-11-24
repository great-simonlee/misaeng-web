import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { FamilyAcceptScreen } from '@screens/nyc/FamilyAcceptScreen'

interface FamilyAcceptPageProps {
  params: Promise<{ locale: string; city: string }>
}

/** /{locale}/{city}/family/accept?token=… — the link in a parent's email request (the child accepts or declines). */
export async function generateMetadata({ params }: FamilyAcceptPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'me')
  return { title: t('familyAccept.metaTitle'), robots: { index: false, follow: false } }
}

export default function FamilyAcceptPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <FamilyAcceptScreen />
    </Suspense>
  )
}
