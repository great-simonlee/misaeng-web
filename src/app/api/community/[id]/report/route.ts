import { after, NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import { COMMUNITY_REPORT_REASONS } from '@lib/constants/communityEngagement'
import { isCommunityEngagementStorageConfigured } from '@lib/supabase/communityEngagement.server'
import { getStoredCommunityPost, patchStoredCommunityPost } from '@lib/supabase/community.server'
import {
  listStoredCommunityComments,
  saveStoredCommunityComments,
} from '@lib/supabase/communityComments.server'
import { AUTO_HIDE_REPORTERS, isModerationHidden } from '@lib/community/moderation'
import { countDistinctReporters, createCommunityReport } from '@lib/community/reports.server'
import { notifyTeamOfCommunityReport } from '@lib/erp/notifyCommunityReport'
import type {
  CommunityComment,
  CommunityEngagementTargetType,
  CommunityReportReason,
  ContentModeration,
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

/**
 * Report a post or comment. POST { targetType, targetId, boardId, reason, detail? } → 200 { report, hidden }.
 * Saved to the community_reports table (or the old JSON before supabase/community_reports.sql runs).
 * The reporter stops seeing the target right away; at AUTO_HIDE_REPORTERS distinct reporters it is hidden for
 * everyone until the team restores it in the ERP. The team is alerted on every report (never fails the request).
 */
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
  // A post report always targets the post in the URL (never a body-supplied id: that let one person push another
  // post over the auto-hide threshold). A comment must belong to this post (checked below).
  const targetId = targetType === 'post' ? postId : String(payload?.targetId || '').trim()
  if (!targetId) return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
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

  try {
    const post = postId.startsWith('mock-') ? null : await getStoredCommunityPost(postId).catch(() => null)
    const comments: CommunityComment[] =
      targetType === 'comment' && post ? await listStoredCommunityComments(postId).catch(() => []) : []
    const comment = targetType === 'comment' ? comments.find((item) => item.id === targetId) ?? null : null
    if (targetType === 'comment' && !comment) {
      return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
    }
    if (targetType === 'post' && !post && !postId.startsWith('mock-')) {
      return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
    }
    const boardId = String(payload?.boardId || '').trim() || post?.categoryId || ''
    const authorUid = (targetType === 'comment' ? comment?.authorUid : post?.authorUid) || null

    const created = await createCommunityReport({
      targetType,
      targetId,
      postId,
      boardId,
      reason: reason as CommunityReportReason,
      detail: detail || null,
      reporterUid: user.uid,
      reporterEmail: user.email,
      authorUid,
    })
    if (!created.ok) {
      return NextResponse.json(
        { error: t('community.report.alreadyReported') },
        { status: 409 },
      )
    }

    // Auto-hide at AUTO_HIDE_REPORTERS distinct reporters (best effort: the report itself is already saved)
    let reportCount = 1
    let autoHidden = false
    try {
      reportCount = await countDistinctReporters(targetType, targetId)
      const target = targetType === 'comment' ? comment : post
      if (reportCount >= AUTO_HIDE_REPORTERS && target && !isModerationHidden(target)) {
        const moderation: ContentModeration = {
          hidden: true,
          reason: 'reports',
          at: Date.now(),
          reportCount,
          restoredAt: null,
          restoredBy: null,
        }
        if (targetType === 'post') {
          autoHidden = await patchStoredCommunityPost(postId, { moderation })
        } else {
          // re-read right before writing so a comment posted meanwhile is not lost
          const latest = await listStoredCommunityComments(postId)
          if (latest.some((item) => item.id === targetId)) {
            await saveStoredCommunityComments(
              postId,
              latest.map((item) => (item.id === targetId ? { ...item, moderation } : item)),
            )
            autoHidden = true
          }
        }
      }
    } catch (moderationError) {
      console.error('Community report auto-hide error:', moderationError)
    }

    after(() =>
      notifyTeamOfCommunityReport({
        targetType,
        postId,
        postTitle: post?.title ?? null,
        commentPreview: comment?.body ?? null,
        board: boardId,
        reason: String(reason),
        detail: detail || null,
        reportCount,
        autoHidden,
        reporterEmail: user.email,
      }),
    )

    // hidden: the reporter no longer sees this post/comment (the app removes it from the screen)
    return NextResponse.json({ report: created.report, hidden: true })
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
