import { NextResponse } from 'next/server'

import { notifyUsers } from '@lib/push/notify.server'
import {
  deleteDueAfterDecision,
  getSubmission,
  isReviewDocStoreConfigured,
  patchSubmission,
} from '@lib/supabase/reviewVerification.server'
import { isVerificationInternalRequest, reviewerEmailFrom } from '@lib/verification/internalAuth.server'
import { isReviewDocRejectReason } from '@lib/verification/reviewDocs'
import { awardVerifiedComponent } from '@lib/verification/reviewDocsService.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/internal/verifications/{id}/decision  (ellieo-erp, header x-internal-secret)
 *   { action: 'approve', reviewerEmail, resultLabel }          resultLabel = company name or visa type (≤ 80 chars)
 *   { action: 'reject',  reviewerEmail, rejectReason: code }   unreadable | mismatch | not_masked | wrong_document | other
 * → { submission }  with delete_due_at = min(decided_at + 72h, uploaded_at + 7d)
 * Only the result is stored — never anything read from the document.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { id } = await context.params
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null
  const reviewerEmail = reviewerEmailFrom(body.reviewerEmail)
  const resultLabel = String(body.resultLabel || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const rejectReason = body.rejectReason
  if (!action || !reviewerEmail) {
    return NextResponse.json({ error: 'action and reviewerEmail are required.' }, { status: 400 })
  }
  if (action === 'approve' && !resultLabel) {
    return NextResponse.json({ error: 'Enter the company name or visa type.' }, { status: 400 })
  }
  if (action === 'reject' && !isReviewDocRejectReason(rejectReason)) {
    return NextResponse.json({ error: 'Choose a reject reason.' }, { status: 400 })
  }

  try {
    const submission = await getSubmission(String(id || '').trim())
    if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: `Already ${submission.status}.` }, { status: 409 })
    }

    const decidedAt = new Date()
    const saved = await patchSubmission(
      submission.id,
      {
        status: action === 'approve' ? 'approved' : 'rejected',
        decided_at: decidedAt.toISOString(),
        decided_by: reviewerEmail,
        result_label: action === 'approve' ? resultLabel : null,
        reject_reason: action === 'reject' ? String(rejectReason) : null,
        delete_due_at: deleteDueAfterDecision(submission.uploaded_at, decidedAt).toISOString(),
      },
      '&status=eq.pending',
    )
    if (!saved) return NextResponse.json({ error: 'Already decided.' }, { status: 409 })

    if (action === 'approve') {
      await awardVerifiedComponent({
        postId: saved.post_id,
        submissionId: saved.id,
        actor: reviewerEmail,
      }).catch((error) => console.error('Verified points component failed:', error))
    }

    notifyUsers({
      type: 'account',
      userIds: [saved.user_id],
      build: (t) => ({
        title: t(`api.push.reviewDocs.${action === 'approve' ? 'approved' : 'rejected'}.title`),
        body: t(`api.push.reviewDocs.${action === 'approve' ? 'approved' : 'rejected'}.body`),
        data: { type: 'verificationDocuments', submissionId: saved.id, postId: saved.post_id ?? '' },
        threadId: 'verification-documents',
      }),
    })

    return NextResponse.json({
      submission: {
        id: saved.id,
        status: saved.status,
        decidedAt: saved.decided_at,
        decidedBy: saved.decided_by,
        resultLabel: saved.result_label,
        rejectReason: saved.reject_reason,
        deleteDueAt: saved.delete_due_at,
      },
    })
  } catch (error) {
    console.error('Internal verification decision error:', error)
    return NextResponse.json({ error: 'Failed to save the decision.' }, { status: 500 })
  }
}
