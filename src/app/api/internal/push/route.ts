import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { listPublicPostings } from '@lib/supabase/jobPostings.server'
import { notifyUsers } from '@lib/push/notify.server'
import { sendJobReviewTestPush } from '@lib/erp/notifyJobReview'
import { listCompanyFollowers } from '@lib/push/store.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Pushes triggered by ellieo-erp (server to server). Header `x-internal-secret: $INTERNAL_PUSH_SECRET`.
 * { type: 'posting', postingId }                         — a posting was approved → followers of its company
 * { type: 'credit', uid, amount, balance, reason?, label? } — credits awarded by an admin
 * { type: 'verification', uid, kind: 'instagram', result: 'approved' | 'rejected' } — a verification was reviewed
 * { type: 'job_review_test', email, source, orgId, target, post: { id, title, createdAt } } — admin test of the
 *   new-job-review push in the Misaeng ERP app, to that admin's own devices only (answers { devices, sent })
 */
/**
 * The ERP sends INTERNAL_POINTS_SECRET when it is set (same as the points routes), otherwise INTERNAL_PUSH_SECRET —
 * accept either, so posting / credit / verification / test pushes are not refused when the two differ.
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  if (!given) return false
  return [process.env.INTERNAL_PUSH_SECRET, process.env.INTERNAL_POINTS_SECRET]
    .map((value) => value?.trim() || '')
    .some((secret) => secret.length === given.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>

  if (body.type === 'job_review_test') {
    const email = String(body.email || '').trim().toLowerCase()
    const source = (body.source || {}) as { source?: unknown; orgId?: unknown }
    const post = (body.post || {}) as { id?: unknown; title?: unknown; createdAt?: unknown }
    const target = body.target as { type?: unknown; id?: unknown } | null
    if (!email || typeof source.source !== 'string') {
      return NextResponse.json({ error: 'email and source are required.' }, { status: 400 })
    }
    const result = await sendJobReviewTestPush({
      email,
      source: { source: source.source, orgId: typeof source.orgId === 'string' ? source.orgId : null },
      target: target && typeof target.type === 'string' ? { type: target.type, id: String(target.id || target.type) } : null,
      post: {
        id: typeof post.id === 'string' ? post.id : null,
        title: String(post.title || 'Sample job review'),
        createdAt: Number(post.createdAt) || Date.now(),
      },
    })
    return NextResponse.json(result)
  }

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
