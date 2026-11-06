import type { Metadata } from 'next'

import { PrivacyPolicyScreen } from '@screens/nyc/PrivacyPolicyScreen'
import { BRAND_CONFIG } from '@lib/brand'
import { toLegalViewDocument } from '@lib/constants/legalDocument'
import { NYC_PRIVACY_POLICY } from '@lib/constants/nycPrivacyPolicy'
import { isLocale, type Locale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { PER_PAGE_METADATA, pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'
import { loadLegalTranslations } from '@lib/legal/translations.server'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(resolveLocale(locale), 'legal')
  const description = t('meta.privacyDescription', { brand: BRAND_CONFIG.name })
  // Ellieo: full per-page metadata (title, og, canonical, hreflang). Misaeng: description only, as before
  if (PER_PAGE_METADATA) {
    const seo = await getT(serviceLocale(locale), 'common.seo')
    return pageMetadata({ locale, path: `/${city}/privacy-policy`, title: seo('privacyTitle'), description })
  }
  return { description }
}

export default async function NycPrivacyPolicyPage({ params }: Props) {
  const { locale } = await params
  const viewLocale = resolveLocale(locale)
  const translations = await loadLegalTranslations('privacy', viewLocale)
  return <PrivacyPolicyScreen doc={toLegalViewDocument(NYC_PRIVACY_POLICY, viewLocale, translations)} />
}
