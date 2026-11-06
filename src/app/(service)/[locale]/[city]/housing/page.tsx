import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { getT } from '@lib/i18n/server'
import { pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'
import { HousingListScreen } from '@screens/nyc/HousingListScreen'

type Props = { params: Promise<{ locale: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(serviceLocale(locale), 'housing')
  return pageMetadata({
    locale,
    path: `/${city}/housing`,
    title: t('list.title'),
    description: t('list.subtitle', { brand: BRAND_CONFIG.name }),
  })
}

export default function HousingPage() {
  return <HousingListScreen />
}
