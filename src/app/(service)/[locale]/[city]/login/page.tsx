import type { Metadata } from 'next'
import { LoadingState } from '@components'
import { Suspense } from 'react'

import { NycLoginScreen } from '@screens/nyc/NycLoginScreen'
import { BRAND_CONFIG } from '@lib/brand'
import { getT } from '@lib/i18n/server'
import { pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'

type Props = { params: Promise<{ locale: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(serviceLocale(locale), 'common.seo')
  return pageMetadata({
    locale,
    path: `/${city}/login`,
    title: t('loginTitle'),
    description: t('loginDescription', { brand: BRAND_CONFIG.name }),
    noindex: true,
  })
}

export default function NycLoginPage() {
  return (
    <Suspense
      fallback={<LoadingState fullPage />}
    >
      <NycLoginScreen />
    </Suspense>
  )
}
