import { NextResponse } from 'next/server'

import { onVerificationCompleted, type VerificationKind } from '@lib/points/facade.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS: VerificationKind[] = ['school_email', 'work_email', 'instagram']

/**
 * ERP → web after approving a verification that ERP decides (workplace = 'work_email', Instagram = 'instagram').
 * Header `x-internal-secret`. { uid, kind, identifier? } (identifier = approved work email / instagram handle).
 * Routes through the facade: nothing for these kinds before cutover; welcome / instagram / referral / profile after.
 * Call it AFTER the profile was updated (the reward reads the approved state from the profile).
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const uid = String(body.uid || '').trim()
    const kind = String(body.kind || '').trim() as VerificationKind
    if (!uid || !KINDS.includes(kind)) {
      return NextResponse.json({ error: `uid and kind (${KINDS.join(', ')}) are required.` }, { status: 400 })
    }
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : null
    const result = await onVerificationCompleted(uid, kind, identifier)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
