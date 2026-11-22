import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { PremiumScreen } from '@screens/nyc/PremiumScreen'

interface PremiumPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: PremiumPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'premium')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default function PremiumPage() {
  return <PremiumScreen />
}
