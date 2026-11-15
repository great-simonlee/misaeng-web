import { NextResponse } from 'next/server'

import { getParentLinksForAdmin, ParentInviteError } from '@lib/parents/parentInvites.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/internal/parents?uid=  (ERP user page, header x-internal-secret = INTERNAL_POINTS_SECRET)
 * → { accountType, invitedBy: { uid, nickname, code, joinedAt } | null, convertedAt, invitedParents: [...] }
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const uid = new URL(request.url).searchParams.get('uid')?.trim() || ''
  if (!uid) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
  try {
    return NextResponse.json(await getParentLinksForAdmin(uid))
  } catch (error) {
    if (error instanceof ParentInviteError) return NextResponse.json({ error: error.code, code: error.code }, { status: error.status })
    return internalErrorResponse(error)
  }
}
