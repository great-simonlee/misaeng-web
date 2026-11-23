import type { Metadata } from 'next'
import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'

import { CreditScreen } from '@screens/credit/CreditScreen'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(
    isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale,
    'credit',
  )
  return namedCityPageMetadata(locale, city, 'credit', {
    description: t('meta.description', { brand: BRAND_CONFIG.name }),
  })
}

export default function NycCreditPage() {
  return <CreditScreen />
}
