import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import {
  isCommunityEngagementStorageConfigured,
  listStoredBeenThere,
  saveStoredBeenThere,
} from '@lib/supabase/communityEngagement.server'
import { setStoredCommunityBeenThereCount } from '@lib/supabase/community.server'
import type { CommunityBeenThere } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

function buildSummary(
  visits: CommunityBeenThere[],
  viewerUid?: string | null,
) {
  return {
    count: visits.length,
    beenThereByMe: viewerUid
      ? visits.some((item) => item.authorUid === viewerUid)
      : false,
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: postId } = await context.params
    const user = await resolveAuthenticatedUser()
    const visits = isCommunityEngagementStorageConfigured()
      ? await listStoredBeenThere(postId)
      : []

    return NextResponse.json({
      visits,
      summary: buildSummary(visits, user?.uid),
    })
  } catch (error) {
    console.error('Community been-there list error:', error)
    return NextResponse.json(
      {
        visits: [],
        summary: { count: 0, beenThereByMe: false },
        error: 'Failed to load been-there.',
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
  const boardId = String(payload?.boardId || 'food').trim() || 'food'

  if (boardId !== 'food') {
    return NextResponse.json(
      { error: '맛집 게시글만 가봤어요를 표시할 수 있어요.' },
      { status: 400 },
    )
  }

  const existing = await listStoredBeenThere(postId)
  const mineIndex = existing.findIndex((item) => item.authorUid === user.uid)

  let next = existing
  let visit: CommunityBeenThere | null = null

  if (mineIndex >= 0) {
    next = existing.filter((_, index) => index !== mineIndex)
  } else {
    const now = Date.now()
    visit = {
      id: `btn_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      postId,
      boardId,
      authorUid: user.uid,
      createdAt: now,
    }
    next = [...existing, visit]
  }

  try {
    await saveStoredBeenThere(postId, next)
    await setStoredCommunityBeenThereCount(postId, next.length)
    return NextResponse.json({
      visit,
      summary: buildSummary(next, user.uid),
    })
  } catch (error) {
    console.error('Community been-there toggle error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '가봤어요 처리에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
