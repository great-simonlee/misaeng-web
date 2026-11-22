import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { PremiumRedeemScreen } from '@screens/nyc/PremiumRedeemScreen'

interface RedeemPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: RedeemPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'premium')
  return { title: t('redeem.title'), description: t('redeem.sub'), robots: { index: false } }
}

export default function PremiumRedeemPage() {
  return <PremiumRedeemScreen />
}
