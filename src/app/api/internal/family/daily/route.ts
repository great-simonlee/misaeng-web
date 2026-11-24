import { NextResponse } from 'next/server'

import { runFamilyDaily } from '@lib/family/daily.server'
import { FamilyError } from '@lib/family/store.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/internal/family/daily (server crontab, hourly; x-internal-secret) — expires email requests, re-stops
 * renewals of ended links, parent renewal / trial reminders and the parent digests (~09:00 KST). Idempotent per day.
 * → { expiredRequests, endedLinks: { stopped, appleNotices }, reminders, digests: { sent, postings?, visaNews? }, at }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json(await runFamilyDaily())
  } catch (error) {
    if (error instanceof FamilyError && error.code === 'SETUP_REQUIRED') {
      return NextResponse.json({ error: 'parent_links tables missing (run supabase/parent_links.sql).', code: error.code }, { status: 503 })
    }
    return internalErrorResponse(error)
  }
}
