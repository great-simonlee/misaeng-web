import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { describeHint, getCreditsConfig, packHints, paymentsEnabled } from '@lib/ellieo/credits.server'
import { EllieoTopUpScreen } from '@screens/ellieo/EllieoTopUpScreen'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: locale === 'vi' ? 'Nạp credit' : 'Top up credits', robots: { index: false } }
}

/** Vietnamese version of a pack hint ("1 Premium listing + a 7-day listing"). */
function hintVi(h: { premiumListings: number; regularListings: number[] }) {
  const parts: string[] = []
  if (h.premiumListings > 0) parts.push(`${h.premiumListings} tin Premium`)
  for (const days of h.regularListings) parts.push(`1 tin ${days} ngày`)
  return parts.join(' + ')
}

/** ellieo.com/credits — credit packs (Stripe Checkout once Ellieo's keys are set; "coming soon" until then). */
export default async function EllieoCreditsPage({ params }: Props) {
  if (BRAND_CONFIG.theme !== 'ellieo') notFound()
  const { locale } = await params
  const [config, hints] = await Promise.all([getCreditsConfig(), packHints().catch(() => [])])
  const packs = config.packs.map((pack) => {
    const h = hints.find((x) => x.id === pack.id) ?? { bonus: 0, premiumListings: 0, regularListings: [] }
    return { ...pack, bonus: h.bonus, hint: describeHint(h), hintVi: hintVi(h) }
  })
  return (
    <EllieoTopUpScreen
      locale={locale}
      packs={packs}
      paymentsEnabled={paymentsEnabled()}
      salesTaxRate={config.salesTaxRate}
      termsHref={`${locale === 'vi' ? '/vi' : ''}/nyc/terms-of-use#ellieo-credits`}
    />
  )
}
