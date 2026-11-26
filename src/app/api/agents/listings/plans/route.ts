import { NextResponse } from 'next/server'

import { activeLicense } from '@lib/agents/agentLicense.server'
import { getCreditsConfig } from '@lib/agents/credits.server'
import { CreditsError, planOptions } from '@lib/agents/listingPlans.server'

import { errorResponse, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Brokered composer / plan sheet: { prices, premiumDays, premiumTotalDays, premium: { slots, used, full, waiting,
 * nextOpensInDays }, balance, topUp: { ios, android } } — everything from the one config.
 */
export async function GET() {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    if (!(await activeLicense(uid))) throw new CreditsError('Brokered listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
    const config = await getCreditsConfig()
    return NextResponse.json(await planOptions(uid, { ios: config.topUpLinkIOS, android: config.topUpLinkAndroid }), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return errorResponse(error, 'listing plans')
  }
}
