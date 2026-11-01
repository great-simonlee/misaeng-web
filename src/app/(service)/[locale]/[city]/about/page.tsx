import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { EllieoAboutScreen } from '@screens/ellieo/EllieoAboutScreen'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

/** Ellieo company & service intro (/nyc/about, /vi/nyc/about). Misaeng has its own corporate /about. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (BRAND_CONFIG.theme !== 'ellieo') return {}
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'hub')
  return {
    title: t('ellieo.about.meta.title'),
    description: t('ellieo.about.meta.description'),
  }
}

export default function CityAboutPage() {
  if (BRAND_CONFIG.theme !== 'ellieo') notFound()
  return <EllieoAboutScreen />
}
