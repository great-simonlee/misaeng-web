import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
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

export async function GET(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isCreditReviewStorageConfigured()) {
      return NextResponse.json(
        { error: t('common.supabaseNotConfigured') },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }

    const { id: postId } = await context.params
    const post = await getStoredCommunityPost(postId)
    if (!post) {
      return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
    }

    const isAuthor = post.authorUid === user.uid
    if (!isAuthor) {
      return NextResponse.json({ error: t('common.forbidden') }, { status: 403 })
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
      { error: t('credit.reviewStatusLoadFailed') },
      { status: 500 },
    )
  }
}

export async function POST(httpRequest: Request, context: RouteContext) {
  const t = await getRequestT(httpRequest, 'api')
  try {
    if (
      !isCommunityStorageConfigured() ||
      !isCreditReviewStorageConfigured()
    ) {
      return NextResponse.json(
        { error: t('common.supabaseNotConfigured') },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid || !user.email) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended

    const { id: postId } = await context.params
    const post = await getStoredCommunityPost(postId)
    if (!post || post.status !== 'open') {
      return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
    }
    if (post.authorUid !== user.uid) {
      return NextResponse.json({ error: t('common.forbidden') }, { status: 403 })
    }
    if (!isCreditReviewEligibleBoard(post.categoryId)) {
      return NextResponse.json(
        { error: t('credit.reviewBoardIneligible') },
        { status: 400 },
      )
    }
    if (!postHasFinalResultForCreditReview(post)) {
      return NextResponse.json(
        {
          error: t('credit.reviewFinalResultRequired'),
          code: 'FINAL_RESULT_REQUIRED',
        },
        { status: 400 },
      )
    }

    const existing = await findCreditReviewByPostId(postId)
    if (existing?.status === 'approved') {
      return NextResponse.json(
        { error: t('credit.reviewAlreadyAwarded'), request: existing },
        { status: 409 },
      )
    }
    if (existing?.status === 'pending') {
      return NextResponse.json(
        { error: t('credit.reviewAlreadyPending'), request: existing },
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
        error: apiErrorMessage(t, error, 'credit.reviewRequestFailed'),
      },
      { status: 500 },
    )
  }
}
