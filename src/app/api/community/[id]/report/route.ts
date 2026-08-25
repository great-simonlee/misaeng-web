import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { COMMUNITY_REPORT_REASONS } from '@lib/constants/communityEngagement'
import {
  isCommunityEngagementStorageConfigured,
  listStoredReports,
  saveStoredReports,
} from '@lib/supabase/communityEngagement.server'
import type {
  CommunityEngagementTargetType,
  CommunityReport,
  CommunityReportReason,
} from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

const REASON_SET = new Set(
  COMMUNITY_REPORT_REASONS.map((item) => item.value),
)

type CreateBody = {
  targetType?: CommunityEngagementTargetType
  targetId?: string
  boardId?: string
  reason?: CommunityReportReason
  detail?: string | null
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
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { id: postId } = await context.params
  const payload = (await request.json().catch(() => null)) as CreateBody | null

  const targetType: CommunityEngagementTargetType =
    payload?.targetType === 'comment' ? 'comment' : 'post'
  const targetId = String(payload?.targetId || '').trim() || postId
  const boardId = String(payload?.boardId || '').trim()
  const reason = payload?.reason
  const detail =
    typeof payload?.detail === 'string' ? payload.detail.trim() : ''

  if (!REASON_SET.has(reason as CommunityReportReason)) {
    return NextResponse.json(
      { error: '신고 사유를 선택해 주세요.' },
      { status: 400 },
    )
  }

  if (detail.length > 1000) {
    return NextResponse.json(
      { error: '상세 내용은 1000자 이내로 작성해 주세요.' },
      { status: 400 },
    )
  }

  if (reason === 'other' && !detail) {
    return NextResponse.json(
      { error: '기타 사유는 내용을 적어 주세요.' },
      { status: 400 },
    )
  }

  const existing = await listStoredReports()
  const duplicated = existing.some(
    (item) =>
      item.targetType === targetType &&
      item.targetId === targetId &&
      item.reporterUid === user.uid &&
      item.status !== 'dismissed',
  )
  if (duplicated) {
    return NextResponse.json(
      { error: '이미 신고한 글/댓글이에요.' },
      { status: 409 },
    )
  }

  const now = Date.now()
  const report: CommunityReport = {
    id: `rpt_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    targetType,
    targetId,
    postId,
    boardId,
    reason: reason as CommunityReportReason,
    detail: detail || null,
    reporterUid: user.uid,
    reporterEmail: user.email,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    resolutionNote: null,
  }

  try {
    await saveStoredReports([report, ...existing])
    return NextResponse.json({ report })
  } catch (error) {
    console.error('Community report create error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '신고 접수에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
