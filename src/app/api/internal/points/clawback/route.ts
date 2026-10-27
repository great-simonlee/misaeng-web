import { NextResponse } from 'next/server'

import { clawbackPost } from '@lib/points/claims.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { legacyNetEarned } from '@lib/points/legacy.server'
import { clawbackSource } from '@lib/points/ledger.server'
import { notifyPointsClawback } from '@lib/points/notify.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP clawback (spec 3.4: false content / accumulated reports). Header `x-internal-secret`.
 * { userId, sourceType: 'post'|'comment'|..., sourceId, amount?, note, requestId }
 *   - takes back what the source earned (ledger + legacy JSON earnings), at most `amount`
 *   - 'post' also closes a pending claim
 *   - requestId = idempotency (retrying the same requestId never claws back twice)
 * → { clawedBack, balance, available, duplicate }. Sends a push when something was taken back.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const userId = String(body.userId || '').trim()
    const sourceType = String(body.sourceType || '').trim()
    const sourceId = String(body.sourceId || '').trim()
    const requestId = String(body.requestId || '').trim()
    const note = String(body.note || '').trim().slice(0, 500)
    if (!userId || !sourceType || !sourceId || !requestId || !note) {
      return NextResponse.json({ error: 'userId, sourceType, sourceId, requestId and note are required.' }, { status: 400 })
    }
    if (!(await isPointsLedgerActive())) {
      return NextResponse.json({ error: 'The points ledger is not active yet (before cutover).', code: 'POINTS_NOT_ACTIVE' }, { status: 409 })
    }
    const amountRaw = Number(body.amount)
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? Math.trunc(amountRaw) : null
    const actor = internalActor(request, body)
    const key = `clawback:admin:${requestId}`

    if (sourceType === 'post' && amount === null) {
      const result = await clawbackPost({ postId: sourceId, uid: userId, reason: note, actor, notify: true, key })
      return NextResponse.json(result)
    }
    const extraEarned = await legacyNetEarned(userId, sourceId)
    const result = await clawbackSource({
      uid: userId,
      sourceType,
      sourceId,
      key,
      reason: sourceType === 'post' ? 'clawback.post' : sourceType === 'comment' ? 'clawback.comment' : 'clawback.admin',
      amount,
      extraEarned,
      createdBy: actor,
      note,
    })
    if (result.clawedBack > 0 && !result.duplicate) notifyPointsClawback(userId, result.clawedBack, result.balance)
    return NextResponse.json(result)
  } catch (error) {
    return internalErrorResponse(error)
  }
}
