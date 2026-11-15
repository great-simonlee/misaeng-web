import { NextResponse } from 'next/server'

import { convertParentToMember, ParentInviteError } from '@lib/parents/parentInvites.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/parents/convert { uid }  (ERP) — a parent account back to a regular account (a student who used the
 * parent link by mistake). The invite becomes 'converted'; an unpaid student reward is forfeited. → { ok } · 409 NOT_PARENT
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as { uid?: unknown }
    const uid = String(body.uid || '').trim()
    if (!uid) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
    return NextResponse.json(await convertParentToMember(uid))
  } catch (error) {
    if (error instanceof ParentInviteError) {
      const message = error.code === 'NOT_PARENT' ? 'This account is not a parent account.' : error.code
      return NextResponse.json({ error: message, code: error.code }, { status: error.status })
    }
    return internalErrorResponse(error)
  }
}
