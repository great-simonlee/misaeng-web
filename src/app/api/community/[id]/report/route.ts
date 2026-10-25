import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
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
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  if (!isCommunityEngagementStorageConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredLocal'),
        code: 'STORAGE_UNAVAILABLE',
      },
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
      { error: t('community.report.reasonRequired') },
      { status: 400 },
    )
  }

  if (detail.length > 1000) {
    return NextResponse.json(
      { error: t('community.report.detailTooLong', { max: formatNumber(locale, 1000) }) },
      { status: 400 },
    )
  }

  if (reason === 'other' && !detail) {
    return NextResponse.json(
      { error: t('community.report.otherDetailRequired') },
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
      { error: t('community.report.alreadyReported') },
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
        error: apiErrorMessage(t, error, 'community.report.failed'),
      },
      { status: 500 },
    )
  }
}
