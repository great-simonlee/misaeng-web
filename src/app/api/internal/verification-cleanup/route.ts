import { NextResponse } from 'next/server'

import { ReviewDocStoreError, isReviewDocStoreConfigured } from '@lib/supabase/reviewVerification.server'
import { isVerificationInternalRequest } from '@lib/verification/internalAuth.server'
import { runVerificationCleanup } from '@lib/verification/reviewDocsService.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/internal/verification-cleanup  (header x-internal-secret: $INTERNAL_VERIFICATION_SECRET)
 * Called every hour by Supabase pg_cron + pg_net (supabase/verification.sql), also by the ERP "Run deletion now".
 * Spec 5.4: expire unreviewed (7 days) → delete due files → confirm 404 → mark deleted → log → push the user.
 * Failures (after 3 retries) and overdue files are reported to ellieo-erp.
 * → { ranAt, expired, deleted, failed, overdue, submissionsCompleted }
 */
export async function POST(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
  try {
    return NextResponse.json(await runVerificationCleanup())
  } catch (error) {
    if (error instanceof ReviewDocStoreError && error.setupRequired) {
      return NextResponse.json({ error: error.message, setupRequired: true }, { status: 503 })
    }
    console.error('Verification cleanup failed:', error)
    return NextResponse.json({ error: 'Cleanup failed.' }, { status: 500 })
  }
}
