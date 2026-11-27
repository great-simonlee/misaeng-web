import { NextResponse } from 'next/server'

import { activeLicense } from '@lib/agents/agentLicense.server'
import { cancelReservation, CreditsError, markRented, purchase } from '@lib/agents/listingPlans.server'
import { getSupabaseServiceClient } from '@lib/supabase/server'

import { errorResponse, jsonBody, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My listing's plan. { action }:
 *   renew { days }  · premium (Boost; on a listing that is up: Boost price only, keeps its end date) · extend (+7 days Boost, once)
 *   reserve (Boost spots full: paid now, starts in order) · cancel_reservation (full refund of the held part) · rented
 * Prices come from the one config; the app never sends one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
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
    if (!(await activeLicense(uid))) throw new CreditsError('Brokered listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
    if (action === 'renew') return NextResponse.json(await purchase(uid, id, 'regular', Number(body.days)))
    if (action === 'premium' || action === 'extend') return NextResponse.json(await purchase(uid, id, action))
    if (action === 'reserve') {
      const { data } = await getSupabaseServiceClient()
        .from('misaeng_listings')
        .select('status, expires_at')
        .eq('id', id)
        .maybeSingle<{ status: string; expires_at: string }>()
      const live = data?.status === 'live' && new Date(data.expires_at).getTime() > Date.now()
      return NextResponse.json(await purchase(uid, id, 'reserve', 0, !live))
    }
    return NextResponse.json({ error: 'Unknown action.', code: 'INVALID' }, { status: 400 })
  } catch (error) {
    return errorResponse(error, 'listing plan')
  }
}
