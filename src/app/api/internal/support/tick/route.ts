import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { runSupportTick } from '@lib/support/tick.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** pg_cron every minute (supabase/support.sql): escalations + delayed reply emails. */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json({ ok: true, ...(await runSupportTick()) })
  } catch (error) {
    console.error('Support tick error:', error)
    return NextResponse.json({ error: (error as Error)?.message || 'Tick failed' }, { status: 500 })
  }
}
