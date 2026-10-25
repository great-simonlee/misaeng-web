import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { CompanyListScreen } from '@screens/nyc/CompanyListScreen'

interface CompaniesPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: CompaniesPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  return { description: t('meta.listDescription') }
}

export default function CompaniesPage() {
  return <CompanyListScreen />
}
