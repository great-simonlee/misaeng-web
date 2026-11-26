import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND } from '@lib/brand'
import { parseLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { describeHint, getCreditsConfig, packHints, paymentsEnabled } from '@lib/agents/credits.server'
import { AgentTopUpScreen } from '@screens/agents/AgentTopUpScreen'
import { creditsEnabled } from '@lib/agents/creditsCore.server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: locale === 'vi' ? 'Nạp credit' : locale === 'en' ? 'Top up credits' : '크레딧 충전', robots: { index: false } }
}

/** Vietnamese version of a pack hint ("1 Premium listing + a 7-day listing"). */
function hintVi(h: { premiumListings: number; regularListings: number[] }) {
  const parts: string[] = []
  if (h.premiumListings > 0) parts.push(`${h.premiumListings} tin Premium`)
  for (const days of h.regularListings) parts.push(`1 tin ${days} ngày`)
  return parts.join(' + ')
}

/** misaeng.com/credits — credit packs (Stripe Checkout once Misaeng's keys are set; "coming soon" until then). */
export default async function MisaengCreditsPage({ params }: Props) {
  if (BRAND !== 'misaeng') notFound()
  if (!(await creditsEnabled().catch(() => false))) notFound()
  const { locale } = await params
  const [config, hints] = await Promise.all([getCreditsConfig(), packHints().catch(() => [])])
  const packs = config.packs.map((pack) => {
    const h = hints.find((x) => x.id === pack.id) ?? { bonus: 0, premiumListings: 0, regularListings: [] }
    return { ...pack, bonus: h.bonus, hint: describeHint(h), hintVi: hintVi(h) }
  })
  return (
    <AgentTopUpScreen
      locale={locale}
      packs={packs}
      paymentsEnabled={paymentsEnabled()}
      salesTaxRate={config.salesTaxRate}
      termsHref={localePath(parseLocale(locale) ?? 'ko', '/nyc/terms-of-use#agent-credits')}
    />
  )
}
