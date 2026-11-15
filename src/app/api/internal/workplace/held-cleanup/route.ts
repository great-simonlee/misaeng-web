import { NextResponse } from 'next/server'

import { cleanupRejectedHeldPosts } from '@lib/community/heldPosts.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST /api/internal/workplace/held-cleanup (ERP / cron) → { deleted }: held posts 30+ days after a rejection. */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json({ deleted: await cleanupRejectedHeldPosts() })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
