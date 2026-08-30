import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import {
  isCommunityEngagementStorageConfigured,
  listStoredRecommends,
  saveStoredRecommends,
} from '@lib/supabase/communityEngagement.server'
import type { CommunityRecommend } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

function buildSummary(
  recommends: CommunityRecommend[],
  viewerUid?: string | null,
) {
  const postRecommends = recommends.filter(
    (item) => item.targetType === 'post' && item.targetId === item.postId,
  )
  return {
    count: postRecommends.length,
    recommendedByMe: viewerUid
      ? postRecommends.some((item) => item.authorUid === viewerUid)
      : false,
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: postId } = await context.params
    const user = await resolveAuthenticatedUser()
    const recommends = isCommunityEngagementStorageConfigured()
      ? await listStoredRecommends(postId)
      : []

    return NextResponse.json({
      recommends,
      summary: buildSummary(recommends, user?.uid),
    })
  } catch (error) {
    console.error('Community recommend list error:', error)
    return NextResponse.json(
      {
        recommends: [],
        summary: { count: 0, recommendedByMe: false },
        error: 'Failed to load recommends.',
      },
      { status: 500 },
    )
  }
}

type ToggleBody = {
  boardId?: string
}

export async function POST(request: Request, context: RouteContext) {
  if (!isCommunityEngagementStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. 로컬에서는 브라우저에 임시 저장돼요.',
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }
  const suspended = await accountSuspendedResponse(user.uid)
  if (suspended) return suspended

  const { id: postId } = await context.params
  const payload = (await request.json().catch(() => null)) as ToggleBody | null
  const boardId = String(payload?.boardId || '').trim()

  const existing = await listStoredRecommends(postId)
  const mineIndex = existing.findIndex(
    (item) =>
      item.targetType === 'post' &&
      item.targetId === postId &&
      item.authorUid === user.uid,
  )

  let next = existing
  let recommend: CommunityRecommend | null = null

  if (mineIndex >= 0) {
    next = existing.filter((_, index) => index !== mineIndex)
  } else {
    const now = Date.now()
    recommend = {
      id: `rec_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      targetType: 'post',
      targetId: postId,
      postId,
      boardId,
      authorUid: user.uid,
      createdAt: now,
    }
    next = [...existing, recommend]
  }

  try {
    await saveStoredRecommends(postId, next)
    return NextResponse.json({
      recommend,
      summary: buildSummary(next, user.uid),
    })
  } catch (error) {
    console.error('Community recommend toggle error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '추천 처리에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
