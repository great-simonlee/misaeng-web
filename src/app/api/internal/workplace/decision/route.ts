import { NextResponse } from 'next/server'

import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { reviewerEmailFrom } from '@lib/verification/internalAuth.server'
import { handleWorkplaceDecision } from '@lib/verification/workplace.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/internal/workplace/decision  (ellieo-erp, header x-internal-secret = INTERNAL_POINTS_SECRET)
 *   { uid, requestId?, action: 'approve' | 'reject', reviewerEmail, rejectReason?, rejectReasonCode? }
 * Call AFTER the ERP saved the request (status) and the profile (workplaceStatus approved/rejected).
 * approve → documents submission approved (files deleted ≤ 72h), held posts published (createdAt = now, points, alerts),
 *           workplace 5P (current/former) + referral via the points facade, push "workplace_approved".
 * reject  → submission rejected, held posts stay hidden and are deleted 30 days later, push "workplace_rejected".
 * Idempotent for the same decision (duplicate: true).
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const uid = String(body.uid || '').trim()
    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null
    const reviewerEmail = reviewerEmailFrom(body.reviewerEmail) ?? 'erp'
    if (!uid || !action) {
      return NextResponse.json({ error: 'uid and action (approve | reject) are required.' }, { status: 400 })
    }
    const result = await handleWorkplaceDecision({
      uid,
      requestId: typeof body.requestId === 'string' ? body.requestId.trim() || null : null,
      action,
      rejectReason: typeof body.rejectReason === 'string' ? body.rejectReason : null,
      rejectReasonCode: typeof body.rejectReasonCode === 'string' ? body.rejectReasonCode : null,
      reviewerEmail,
    })
    return NextResponse.json(result)
  } catch (error) {
    return internalErrorResponse(error)
  }
}
