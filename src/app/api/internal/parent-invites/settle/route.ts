import { NextResponse } from 'next/server'

import { ParentInviteError, settleParentRewards } from '@lib/parents/parentInvites.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST /api/internal/parent-invites/settle (ERP / cron) → { paid, forfeited }: parent invite rewards past their due time. */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json(await settleParentRewards())
  } catch (error) {
    if (error instanceof ParentInviteError) {
      return NextResponse.json({ error: 'parent_invites table missing (run supabase/release_1_0_7.sql).', code: error.code }, { status: error.status })
    }
    return internalErrorResponse(error)
  }
}
