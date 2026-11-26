import { NextResponse } from 'next/server'

import { isAppleCreditsConfigured } from '@lib/agents/appleCredits.server'
import { getCreditsConfig, quotePack } from '@lib/agents/credits.server'
import { isInHouse } from '@lib/agents/inHouse.server'
import { creditBalance, creditLedger } from '@lib/agents/listingPlans.server'

import { errorResponse, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My credits: { balance: { paid, staff, debt, total }, ledger, inHouse, canBuy, packs: [{ id, credits, bonusCredits,
 * priceCents, appleProductId, offers }], appStore, topUp: { ios, android } }. A member with no rows gets a real zero
 * balance (never sample numbers). In-house members: staff credits only, canBuy = false (no Top up).
 */
export async function GET() {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const inHouse = await isInHouse(uid)
    const [balance, ledger, config] = await Promise.all([creditBalance(uid), creditLedger(uid, 100), getCreditsConfig()])
    const packs = inHouse
      ? []
      : await Promise.all(
          config.packs.map(async (pack) => {
            const quote = await quotePack({ uid, packId: pack.id, appStore: true }).catch(() => null)
            return {
              id: pack.id,
              credits: pack.credits,
              bonusCredits: quote?.bonusCredits ?? 0,
              priceCents: pack.priceCents,
              appleProductId: pack.appleProductId ?? null,
              offers: quote?.offers ?? [],
            }
          }),
        )
    return NextResponse.json(
      {
        balance,
        ledger,
        inHouse,
        canBuy: !inHouse,
        packs,
        appStore: isAppleCreditsConfigured(),
        topUp: { ios: !inHouse && config.topUpLinkIOS, android: !inHouse && config.topUpLinkAndroid },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return errorResponse(error, 'credits')
  }
}
