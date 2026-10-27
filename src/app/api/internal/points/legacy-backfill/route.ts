import { NextResponse } from 'next/server'

import { getPointsEngineState } from '@lib/points/engine.server'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { isLegacyBackfillConfigured, runLegacyBackfillBatch } from '@lib/points/legacyBackfill.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * One-time legacy credit backfill for every user, BEFORE the points cutover (WIRING.md, cutover runbook).
 * Header `x-internal-secret`, optional `x-admin-id`.
 * { cursor?: string|null, limit?: number (1–100, default 25), dryRun?: boolean (default true) }
 * → { dryRun, scanned, candidatesTotal, changedUsers, addedPoints, errors, results[], nextCursor, done }
 * Call again with `nextCursor` until `done`. Idempotent: re-running adds nothing new. A real run is refused once
 * the ledger is active (the legacy JSON is frozen after cutover); a dry run is always allowed.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    if (!isLegacyBackfillConfigured()) {
      return NextResponse.json({ error: 'Supabase Storage is not configured.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 })
    }
    const dryRun = body.dryRun !== false
    const cursor = typeof body.cursor === 'string' && body.cursor.trim() ? body.cursor.trim() : null
    const limitRaw = Math.trunc(Number(body.limit ?? 25))
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25

    const state = await getPointsEngineState()
    if (!dryRun && state.engine === 'ledger') {
      return NextResponse.json(
        { error: 'The points ledger is already active (after cutover): the legacy credit data is frozen.', code: 'POINTS_ALREADY_ACTIVE' },
        { status: 409 },
      )
    }

    const batch = await runLegacyBackfillBatch({ cursor, limit, dryRun })
    if (!dryRun) {
      console.info('Points legacy backfill batch', {
        actor: internalActor(request, body),
        cursor,
        scanned: batch.scanned,
        changedUsers: batch.changedUsers,
        addedPoints: batch.addedPoints,
        errors: batch.errors,
      })
    }
    return NextResponse.json({ ...batch, engine: state.engine, cutoverAt: state.cutoverAt })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
