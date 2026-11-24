import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { FamilyScreen } from '@screens/nyc/FamilyScreen'

interface FamilyPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: FamilyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'me')
  return { title: t('family.metaTitle'), robots: { index: false, follow: false } }
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <FamilyScreen />
    </Suspense>
  )
}
