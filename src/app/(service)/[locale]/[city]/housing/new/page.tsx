import { redirect } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { localePath } from '@lib/i18n/paths'
import { isLocale } from '@lib/i18n/locales'
import { HousingNewScreen } from '@screens/nyc/HousingNewScreen'

type HousingNewPageProps = { params: Promise<{ locale: string; city: string }> }

export default async function HousingNewPage({ params }: HousingNewPageProps) {
  // Listings are posted by the Misaeng team (@misaeng.com accounts) from misaeng.com / the ERP: not on Ellieo
  if (BRAND_CONFIG.id === 'ellieo') {
    const { locale, city } = await params
    redirect(localePath(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, `/${city}/housing`))
  }
  return <HousingNewScreen />
}
