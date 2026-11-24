import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { assertParentCanBuy } from '@lib/family/billing.server'
import { FamilyError } from '@lib/family/store.server'
import { getRequestT } from '@lib/i18n/server'
import { beneficiaryIdsFor } from '@lib/premium/beneficiary.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/premium/beneficiary?forUid=child — ids for an in-app purchase a parent makes for a linked child:
 * → { appAccountToken (UUID string, iOS appAccountToken), googleAccountId (64 hex, Play obfuscatedAccountId), trialAvailable }.
 * The App Store / Play handlers then save the purchase as user_uid = child, payer_uid = parent.
 * Only when the parent may buy (409 OWN_SUBSCRIPTION | OTHER_PARENT | ALREADY_PAID_BY_YOU) and holds no other in-app
 * subscription (409 IN_APP_LIMIT → use web checkout with forUid). 403 NOT_PARENT | NOT_LINKED.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, { status: 401 })
  const forUid = new URL(request.url).searchParams.get('forUid')?.trim() || ''
  if (!forUid || forUid === user.uid) return NextResponse.json({ error: 'forUid is required.', code: 'INVALID' }, { status: 400 })
  try {
    const { childRows } = await assertParentCanBuy(user.uid, forUid, { inApp: true })
    const ids = await beneficiaryIdsFor(forUid, user.uid)
    // trialAvailable: the child never had any Premium row (the store decides the actual intro offer eligibility)
    return NextResponse.json({ ...ids, trialAvailable: childRows.length === 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof FamilyError) {
      return NextResponse.json({ error: t(error.key, error.params), code: error.code }, { status: error.status })
    }
    console.error('[premium/beneficiary]', error)
    return NextResponse.json({ error: 'Try again in a moment.', code: 'FAILED' }, { status: 503 })
  }
}
