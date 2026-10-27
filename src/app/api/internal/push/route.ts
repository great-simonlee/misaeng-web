import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { listPublicPostings } from '@lib/supabase/jobPostings.server'
import { notifyUsers } from '@lib/push/notify.server'
import { listCompanyFollowers } from '@lib/push/store.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Pushes triggered by ellieo-erp (server to server). Header `x-internal-secret: $INTERNAL_PUSH_SECRET`.
 * { type: 'posting', postingId }                         — a posting was approved → followers of its company
 * { type: 'credit', uid, amount, balance, reason?, label? } — credits awarded by an admin
 * { type: 'verification', uid, kind: 'instagram', result: 'approved' | 'rejected' } — a verification was reviewed
 */
function authorized(request: Request) {
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim()
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  if (!secret || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>

  if (body.type === 'posting') {
    const postingId = String(body.postingId || '').trim()
    const posting = (await listPublicPostings()).find((p) => p.id === postingId)
    if (!posting) return NextResponse.json({ sent: false, reason: 'not public' })
    const followers = await listCompanyFollowers(posting.company.id)
    notifyUsers({
      type: 'posting',
      userIds: followers,
      build: (t) => ({
        title: t('api.push.posting.title', { company: posting.company.name }),
        body: t('api.push.posting.body', { title: posting.title }),
        data: { type: 'posting', postingId: posting.id, companySlug: posting.company.slug },
        threadId: `company-${posting.company.slug}`,
      }),
    })
    return NextResponse.json({ sent: true, followers: followers.length })
  }

  if (body.type === 'credit') {
    const uid = String(body.uid || '').trim()
    const amount = Math.trunc(Number(body.amount) || 0)
    if (!uid || amount <= 0) return NextResponse.json({ error: 'uid and a positive amount are required.' }, { status: 400 })
    const reason = String(body.reason || '').trim()
    notifyUsers({
      type: 'credit',
      userIds: [uid],
      build: (t) => {
        const key = `credit.ledger.reasons.${reason}`
        const label = reason && t(key) !== key ? t(key) : String(body.label || '')
        return {
          title: t('api.push.credit.title', { amount }),
          body: t('api.push.credit.body', { label, balance: Math.trunc(Number(body.balance) || 0) }),
          data: { type: 'credit' },
          threadId: 'credit',
        }
      },
    })
    return NextResponse.json({ sent: true })
  }

  if (body.type === 'verification') {
    const uid = String(body.uid || '').trim()
    const kind = String(body.kind || '').trim()
    const result = body.result === 'approved' ? 'approved' : body.result === 'rejected' ? 'rejected' : null
    if (!uid || kind !== 'instagram' || !result) {
      return NextResponse.json({ error: 'uid, kind and result are required.' }, { status: 400 })
    }
    notifyUsers({
      type: 'account',
      userIds: [uid],
      build: (t) => ({
        title: t(`api.push.verification.${kind}.${result}.title`),
        body: t(`api.push.verification.${kind}.${result}.body`),
        data: { type: 'verification', kind },
        threadId: 'verification',
      }),
    })
    return NextResponse.json({ sent: true })
  }

  return NextResponse.json({ error: 'Unknown type.' }, { status: 400 })
}
