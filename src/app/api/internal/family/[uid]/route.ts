import { NextResponse } from 'next/server'

import { getFamilyForAdmin } from '@lib/family/admin.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/internal/family/{uid} (ERP user detail, x-internal-secret) →
 * { parents: [{ uid, nickname, source, status, linkedAt, endedAt, endedBy }], children: [same],
 *   requests: [{ id, direction, emailMasked, parentUid, parentNickname, childUid, status, createdAt, expiresAt, decidedAt }],
 *   entitlements: [{ id, user_uid, payer_uid, payer_nickname, child_nickname, source, plan, status, current_period_end,
 *   cancel_at_period_end, external_id, created_at, needs_manual_cancel }], parentPremium: { until } }
 * (setupRequired: true + empty lists before supabase/parent_links.sql)
 */
export async function GET(request: Request, context: { params: Promise<{ uid: string }> }) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const { uid } = await context.params
  const id = decodeURIComponent(uid || '').trim()
  if (!id) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
  try {
    return NextResponse.json(await getFamilyForAdmin(id))
  } catch (error) {
    return internalErrorResponse(error)
  }
}
