import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { getT } from '@lib/i18n/server'
import { pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'
import { EllieoPartnersScreen } from '@screens/ellieo/EllieoPartnersScreen'
import { PartnerSchoolsScreen } from '@screens/nyc/PartnerSchoolsScreen'

/** Partners: Misaeng shows its Korean student associations, Ellieo its VSAs and creators */
const PartnersScreen = BRAND_CONFIG.theme === 'ellieo' ? EllieoPartnersScreen : PartnerSchoolsScreen

type Props = { params: Promise<{ locale: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(serviceLocale(locale), 'common.seo')
  return pageMetadata({
    locale,
    path: `/${city}/partners`,
    title: t('partnersTitle'),
    description: t('partnersDescription', { brand: BRAND_CONFIG.name }),
  })
}

export default function NycPartnersPage() {
  return <PartnersScreen />
}
