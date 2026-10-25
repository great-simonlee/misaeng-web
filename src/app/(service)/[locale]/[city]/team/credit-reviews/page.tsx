import type { Metadata } from 'next'

import { CreditReviewsScreen } from '@screens/nyc/CreditReviewsScreen'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(
    isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale,
    'credit',
  )
  return {
    description: t('meta.reviewsDescription'),
  }
}

export default function CreditReviewsPage() {
  return <CreditReviewsScreen />
}
