import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import {
  isCreditReviewEligibleBoard,
  postHasFinalResultForCreditReview,
} from '@lib/community/creditFinalResult'
import { COMMUNITY_CREDIT_REVIEW_BONUS } from '@lib/constants/communityCredit'
import {
  getStoredCommunityPost,
  isCommunityStorageConfigured,
} from '@lib/supabase/community.server'
import {
  findCreditReviewByPostId,
  isCreditReviewStorageConfigured,
  saveStoredCreditReviewRequest,
  type CommunityCreditReviewRequest,
} from '@lib/supabase/communityCreditReview.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isCreditReviewStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const { id: postId } = await context.params
    const post = await getStoredCommunityPost(postId)
    if (!post) {
      return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
    }

    const isAuthor = post.authorUid === user.uid
    if (!isAuthor) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
    }

    const existing = await findCreditReviewByPostId(postId)
    return NextResponse.json({
      eligible: postHasFinalResultForCreditReview(post),
      bonusAmount: COMMUNITY_CREDIT_REVIEW_BONUS,
      request: existing,
    })
  } catch (error) {
    console.error('Credit review GET error:', error)
    return NextResponse.json(
      { error: '리뷰 요청 상태를 불러오지 못했어요.' },
      { status: 500 },
    )
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    if (
      !isCommunityStorageConfigured() ||
      !isCreditReviewStorageConfigured()
    ) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid || !user.email) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const { id: postId } = await context.params
    const post = await getStoredCommunityPost(postId)
    if (!post || post.status !== 'open') {
      return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
    }
    if (post.authorUid !== user.uid) {
      return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
    }
    if (!isCreditReviewEligibleBoard(post.categoryId)) {
      return NextResponse.json(
        { error: '이 게시판은 추가 크레딧 요청 대상이 아니에요.' },
        { status: 400 },
      )
    }
    if (!postHasFinalResultForCreditReview(post)) {
      return NextResponse.json(
        {
          error:
            '타임라인에 최종 결과(승인·카드 수령·Offer·거절 등)를 먼저 기록해 주세요.',
          code: 'FINAL_RESULT_REQUIRED',
        },
        { status: 400 },
      )
    }

    const existing = await findCreditReviewByPostId(postId)
    if (existing?.status === 'approved') {
      return NextResponse.json(
        { error: '이미 리뷰 보너스가 지급된 글이에요.', request: existing },
        { status: 409 },
      )
    }
    if (existing?.status === 'pending') {
      return NextResponse.json(
        { error: '이미 검토 대기 중이에요.', request: existing },
        { status: 409 },
      )
    }

    const now = Date.now()
    const request: CommunityCreditReviewRequest = {
      id: `cr_${postId}_${now.toString(36)}`,
      postId,
      boardId: post.categoryId,
      postTitle: post.title,
      authorUid: user.uid,
      authorEmail: user.email,
      authorNickname: post.authorNickname,
      status: 'pending',
      reason: 'review-bonus',
      createdAt: now,
      updatedAt: now,
      reviewedByUid: null,
      reviewedByEmail: null,
      reviewedAt: null,
      rejectReason: null,
    }

    const saved = await saveStoredCreditReviewRequest(request)
    return NextResponse.json({
      ok: true,
      bonusAmount: COMMUNITY_CREDIT_REVIEW_BONUS,
      request: saved,
    })
  } catch (error) {
    console.error('Credit review POST error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '추가 크레딧 요청에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
