import { NextResponse } from 'next/server'

import { activeLicense, isInHouse } from '@lib/ellieo/agentLicense.server'
import { cancelReservation, CreditsError, markRented, purchase } from '@lib/ellieo/listingPlans.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My listing's plan. { action }:
 *   renew { days: 7|14|28 }  · premium (new Premium or upgrade a regular one) · extend (+7 days Premium, once)
 *   reserve (Premium spots full: paid now, starts in order) · cancel_reservation (full refund) · rented
 * Prices are the server's; in-house staff renew for free.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    const action = String(body.action ?? '')
    if (action === 'rented') {
      await markRented(uid, id)
      return NextResponse.json({ ok: true })
    }
    if (action === 'cancel_reservation') {
      await cancelReservation(uid, id)
      return NextResponse.json({ ok: true })
    }
    const license = await activeLicense(uid)
    if (!license) throw new CreditsError('Brokered listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
    const inHouse = await isInHouse(license.id)
    if (inHouse) {
      if (action !== 'renew') throw new CreditsError('In-house listings are free and never take a Premium spot.', 'IN_HOUSE', 400)
      return NextResponse.json(await purchase(uid, id, 'free'))
    }
    if (action === 'renew') return NextResponse.json(await purchase(uid, id, 'regular', Number(body.days)))
    if (action === 'premium' || action === 'extend' || action === 'reserve') return NextResponse.json(await purchase(uid, id, action))
    return NextResponse.json({ error: 'Unknown action.', code: 'INVALID' }, { status: 400 })
  } catch (error) {
    return errorResponse(error, 'listing plan')
  }
}
