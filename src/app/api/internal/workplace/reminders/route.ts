import { NextResponse } from 'next/server'

import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { sendWorkplaceReminders } from '@lib/verification/workplace.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/workplace/reminders (ERP / cron, e.g. hourly) → { reminded }
 * Pending workplace requests older than 24 h: one push to the Super Admin (Misaeng ERP app), once per request.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json({ reminded: await sendWorkplaceReminders() })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
