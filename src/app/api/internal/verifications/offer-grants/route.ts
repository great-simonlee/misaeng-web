import { NextResponse } from 'next/server'

import { getStoredCommunityPost } from '@lib/supabase/community.server'
import {
  grantOfferVerification,
  isReviewDocStoreConfigured,
  listOfferVerifications,
  NO_ACCOUNT_UID,
  revokeOfferVerificationGrant,
} from '@lib/supabase/reviewVerification.server'
import { isVerificationInternalRequest, reviewerEmailFrom } from '@lib/verification/internalAuth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 합격 인증 given by an admin (ellieo-erp, header x-internal-secret), for reviews without an upload.
 *   GET  ?postIds=a,b,c                                         → { verified: { [postId]: { resultLabel, adminGrant } } }
 *   POST { action: 'grant', postId, reviewerEmail, resultLabel } → { ok, resultLabel }   job-review posts only
 *   POST { action: 'revoke', postId, reviewerEmail }             → { ok, revoked }      admin grants only
 */
export async function GET(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
  const postIds = (new URL(request.url).searchParams.get('postIds') || '').split(',')
  try {
    const verified = await listOfferVerifications(postIds)
    return NextResponse.json({ verified: Object.fromEntries(verified) })
  } catch (error) {
    console.error('Offer grants list error:', error)
    return NextResponse.json({ error: 'Failed to load offer verifications.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const action = body.action === 'grant' ? 'grant' : body.action === 'revoke' ? 'revoke' : null
  const postId = String(body.postId || '').trim()
  const reviewerEmail = reviewerEmailFrom(body.reviewerEmail)
  const resultLabel = String(body.resultLabel || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!action || !postId || !reviewerEmail) {
    return NextResponse.json({ error: 'action, postId and reviewerEmail are required.' }, { status: 400 })
  }
  if (action === 'grant' && !resultLabel) {
    return NextResponse.json({ error: 'Enter the company name.' }, { status: 400 })
  }

  try {
    const post = await getStoredCommunityPost(postId)
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    if (post.categoryId !== 'job-review') {
      return NextResponse.json({ error: 'Only interview / job reviews can be offer verified.' }, { status: 400 })
    }
    // A review the team added without an account still gets the badge (NO_ACCOUNT_UID)
    const userId = String(post.authorUid || '').trim() || NO_ACCOUNT_UID

    if (action === 'revoke') {
      const revoked = await revokeOfferVerificationGrant({ postId, userId, reviewerEmail })
      return NextResponse.json({ ok: true, revoked })
    }
    const existing = (await listOfferVerifications([postId])).get(postId)
    if (existing) return NextResponse.json({ ok: true, resultLabel: existing.resultLabel, already: true })
    await grantOfferVerification({ postId, userId, board: post.categoryId, resultLabel, reviewerEmail })
    return NextResponse.json({ ok: true, resultLabel })
  } catch (error) {
    console.error('Offer grant error:', error)
    return NextResponse.json({ error: 'Failed to save the offer verification.' }, { status: 500 })
  }
}
