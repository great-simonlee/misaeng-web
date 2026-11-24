import { NextResponse } from 'next/server'

import { internalActor, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { addExcluded, analyticsError, listExcluded, removeExcluded } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Accounts left out of every analytics number (review / test accounts …). @misaeng.com and staff are always out. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json({ accounts: await listExcluded() })
  } catch (error) {
    return analyticsError(error)
  }
}

/** POST {uid? | email?, reason?} */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = (await request.json().catch(() => ({}))) as { uid?: string; email?: string; reason?: string }
  try {
    const uid = await addExcluded(body, internalActor(request))
    if (!uid) return NextResponse.json({ error: 'No Misaeng account found for that uid or email.' }, { status: 404 })
    return NextResponse.json({ ok: true, uid })
  } catch (error) {
    return analyticsError(error)
  }
}

/** DELETE ?uid=… */
export async function DELETE(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const uid = new URL(request.url).searchParams.get('uid')?.trim()
  if (!uid) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
  try {
    await removeExcluded(uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return analyticsError(error)
  }
}
