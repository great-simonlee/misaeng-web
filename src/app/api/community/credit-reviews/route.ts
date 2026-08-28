import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { awardReviewBonusCredit } from '@lib/community/creditLedger'
import { isMisaengEmail } from '@lib/constants/nyc'
import { COMMUNITY_CREDIT_REVIEW_BONUS } from '@lib/constants/communityCredit'
import {
  getStoredCreditReviewRequest,
  isCreditReviewStorageConfigured,
  listStoredCreditReviewRequests,
  saveStoredCreditReviewRequest,
} from '@lib/supabase/communityCreditReview.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DecideBody = {
  requestId?: string
  action?: 'approve' | 'reject'
  rejectReason?: string
}

export async function GET(request: Request) {
  try {
    if (!isCreditReviewStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid || !isMisaengEmail(user.email)) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')?.trim()
    const all = await listStoredCreditReviewRequests()
    const filtered =
      status === 'pending' || status === 'approved' || status === 'rejected'
        ? all.filter((item) => item.status === status)
        : all

    return NextResponse.json({
      bonusAmount: COMMUNITY_CREDIT_REVIEW_BONUS,
      requests: filtered,
    })
  } catch (error) {
    console.error('Credit reviews list error:', error)
    return NextResponse.json(
      { error: '리뷰 목록을 불러오지 못했어요.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!isCreditReviewStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid || !user.email || !isMisaengEmail(user.email)) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as DecideBody | null
    const requestId = String(body?.requestId || '').trim()
    const action = body?.action
    if (!requestId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
    }

    const existing = await getStoredCreditReviewRequest(requestId)
    if (!existing) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없어요.' },
        { status: 404 },
      )
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 요청이에요.', request: existing },
        { status: 409 },
      )
    }

    const post = await getStoredCommunityPost(existing.postId)
    if (!post || post.status !== 'open') {
      return NextResponse.json(
        { error: '대상 글이 없거나 삭제되었어요.' },
        { status: 404 },
      )
    }

    if (action === 'reject') {
      const saved = await saveStoredCreditReviewRequest({
        ...existing,
        status: 'rejected',
        reviewedByUid: user.uid,
        reviewedByEmail: user.email,
        reviewedAt: Date.now(),
        rejectReason: String(body?.rejectReason || '').trim() || null,
      })
      return NextResponse.json({ ok: true, request: saved })
    }

    const credited = await awardReviewBonusCredit({
      uid: existing.authorUid,
      postId: existing.postId,
    })
    if (!credited) {
      return NextResponse.json(
        { error: '크레딧 지급에 실패했어요. 저장소 설정을 확인해 주세요.' },
        { status: 500 },
      )
    }

    const saved = await saveStoredCreditReviewRequest({
      ...existing,
      status: 'approved',
      reviewedByUid: user.uid,
      reviewedByEmail: user.email,
      reviewedAt: Date.now(),
      rejectReason: null,
    })

    return NextResponse.json({
      ok: true,
      bonusAmount: COMMUNITY_CREDIT_REVIEW_BONUS,
      request: saved,
      balance: credited.balance,
    })
  } catch (error) {
    console.error('Credit review decide error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '처리에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
