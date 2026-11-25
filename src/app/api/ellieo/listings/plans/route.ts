import { NextResponse } from 'next/server'

import { activeLicense, isInHouse } from '@lib/ellieo/agentLicense.server'
import { CreditsError, planOptions } from '@lib/ellieo/listingPlans.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Brokered composer / plan sheet: { prices, premiumDays, premiumTotalDays, premium: { slots, used, full, waiting, nextOpensInDays }, balance, inHouse } */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const license = await activeLicense(uid)
    if (!license) throw new CreditsError('Brokered listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
    return NextResponse.json(await planOptions(uid, await isInHouse(license.id)), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'listing plans')
  }
}
