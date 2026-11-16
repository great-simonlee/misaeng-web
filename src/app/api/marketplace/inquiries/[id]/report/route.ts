import { NextResponse } from 'next/server'

import { COMMUNITY_REPORT_REASONS } from '@lib/constants/communityEngagement'
import type { CommunityReportReason } from '@/types/nyc'
import { createCommunityReport } from '@lib/community/reports.server'
import { notifyTeamOfCommunityReport } from '@lib/erp/notifyCommunityReport'
import {
  InquiryError,
  inquiryCounterpart,
  markInquiryReported,
  recentInquiryMessages,
} from '@lib/marketplace/inquiries.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 중고거래 대화 신고 (app): POST { reason, detail? } → { ok } / 409 duplicate.
 * Saved with the community reports (target = the conversation, post = the listing, author = the other person) with the
 * last messages in the detail, and the team is alerted (ERP, mail, the report handler's push). Nothing is auto-hidden.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const { id } = await context.params
  const body = ((await request.json().catch(() => null)) || {}) as { reason?: unknown; detail?: unknown }
  const reason = String(body.reason || 'other') as CommunityReportReason
  if (!COMMUNITY_REPORT_REASONS.some((item) => item.value === reason)) {
    return NextResponse.json({ error: 'Invalid reason.' }, { status: 400 })
  }
  try {
    const other = await inquiryCounterpart(user.uid, id)
    const [post, messages] = await Promise.all([
      getStoredCommunityPost(other.thread.post_id).catch(() => null),
      recentInquiryMessages(id).catch(() => []),
    ])
    const transcript = messages
      .map((m) => `${m.sender_id === user.uid ? 'Reporter' : other.nickname || 'Other'}: ${m.body.slice(0, 160)}`)
      .join('\n')
    const note = String(body.detail || '').trim().slice(0, 500)
    // Says plainly that this is a 중고거래 conversation (not a comment), with whom and about which listing
    const header = `[중고거래 대화 신고 / Marketplace conversation] ${other.nickname || other.uid} · ${post?.title ?? other.thread.post_id} · inquiry ${id}`
    const detail = [header, note, transcript].filter(Boolean).join('\n').slice(0, 2000)
    const result = await createCommunityReport({
      targetType: 'comment',
      targetId: id,
      postId: other.thread.post_id,
      boardId: 'marketplace',
      reason,
      detail,
      reporterUid: user.uid,
      reporterEmail: user.email || '',
      authorUid: other.uid,
    })
    if (!result.ok) return NextResponse.json({ error: 'Already reported.', code: 'duplicate' }, { status: 409 })
    await markInquiryReported(id, reason)
    await notifyTeamOfCommunityReport({
      targetType: 'comment',
      targetId: id,
      postId: other.thread.post_id,
      postTitle: `[중고거래 대화] ${post?.title ?? other.thread.post_id}`,
      commentPreview: `[중고거래 대화 신고 / Marketplace conversation] ${messages.at(-1)?.body ?? ''}`,
      board: 'marketplace',
      reason,
      detail,
      reportCount: 1,
      autoHidden: false,
    }).catch(() => undefined)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof InquiryError) return NextResponse.json({ error: error.code, code: error.code }, { status: error.status })
    console.error('Marketplace inquiry report error:', error)
    return NextResponse.json({ error: 'Failed to report.' }, { status: 500 })
  }
}
