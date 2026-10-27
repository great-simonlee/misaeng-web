import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import {
  ReviewDocStoreError,
  getSubmission,
  isReviewDocStoreConfigured,
  patchSubmission,
  toOwnerSubmission,
} from '@lib/supabase/reviewVerification.server'
import { deleteSubmissionFilesNow } from '@lib/verification/reviewDocsService.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/verifications/{id} — "delete now": the owner's files are deleted immediately (confirmed + logged as
 * user_request). A submission still waiting for review is withdrawn. The result of a decided one is kept.
 * → { submission }
 */
export async function DELETE(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  if (!isReviewDocStoreConfigured()) {
    return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
  }

  const { id } = await context.params
  try {
    const submission = await getSubmission(String(id || '').trim())
    if (!submission || submission.user_id !== user.uid) {
      return NextResponse.json({ error: t('reviewDocs.notFound') }, { status: 404 })
    }

    let current = submission
    if (submission.status === 'pending') {
      const withdrawn = await patchSubmission(submission.id, { status: 'withdrawn' }, '&status=eq.pending')
      if (withdrawn) current = { ...submission, ...withdrawn }
    }

    const result = await deleteSubmissionFilesNow(current, 'user_request')
    if (result.failed > 0) {
      // Retried by the hourly job (due now); the user sees "deleting".
      return NextResponse.json({ error: t('reviewDocs.deleteFailed') }, { status: 502 })
    }
    const fresh = await getSubmission(submission.id)
    return NextResponse.json({ submission: fresh ? toOwnerSubmission(fresh) : null })
  } catch (error) {
    if (error instanceof ReviewDocStoreError && error.setupRequired) {
      return NextResponse.json({ error: t('reviewDocs.notReady') }, { status: 503 })
    }
    console.error('Verification delete error:', error)
    return NextResponse.json({ error: t('reviewDocs.deleteFailed') }, { status: 500 })
  }
}
