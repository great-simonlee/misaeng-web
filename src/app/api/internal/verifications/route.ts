import { NextResponse } from 'next/server'

import { getStoredCommunityPost } from '@lib/supabase/community.server'
import {
  ReviewDocStoreError,
  isReviewDocStoreConfigured,
  listSubmissionsByStatus,
  type SubmissionWithFiles,
} from '@lib/supabase/reviewVerification.server'
import { isVerificationInternalRequest } from '@lib/verification/internalAuth.server'
import { REVIEW_DOC_STALE_HOURS } from '@lib/verification/reviewDocs'
import {
  getDeletionDashboard,
  runVerificationCleanupOpportunistically,
} from '@lib/verification/reviewDocsService.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

async function postSummary(postId: string | null) {
  if (!postId) return null
  const post = await getStoredCommunityPost(postId).catch(() => null)
  if (!post) return { id: postId, exists: false }
  return {
    id: post.id,
    exists: true,
    title: post.title,
    categoryId: post.categoryId,
    /** job-review: company as written; visa board: application type */
    company: post.categoryId === 'job-review' ? post.location || null : null,
    cptOptType: post.cptOptType ?? null,
    authorNickname: post.authorNickname ?? null,
  }
}

async function shape(row: SubmissionWithFiles, now: number) {
  const files = Array.isArray(row.verification_files) ? row.verification_files : []
  const ageHours = (now - new Date(row.uploaded_at).getTime()) / HOUR
  return {
    id: row.id,
    userId: row.user_id,
    postId: row.post_id,
    board: row.board,
    kind: row.kind,
    status: row.status,
    uploadedAt: row.uploaded_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    rejectReason: row.reject_reason,
    resultLabel: row.result_label,
    deleteDueAt: row.delete_due_at,
    deletedAt: row.deleted_at,
    ageHours: Math.round(ageHours * 10) / 10,
    stale: row.status === 'pending' && ageHours >= REVIEW_DOC_STALE_HOURS,
    files: files
      .sort((a, b) => a.storage_path.localeCompare(b.storage_path))
      .map((f) => ({ id: f.id, mimeType: f.mime_type, sizeBytes: f.size_bytes, deletedAt: f.deleted_at })),
    post: await postSummary(row.post_id),
  }
}

/**
 * GET /api/internal/verifications?view=pending|recent  (ellieo-erp, header x-internal-secret)
 * → { pendingCount, submissions: [...], dashboard: { deletedToday, due, nextDueAt, failed, overdue, ... }, generatedAt }
 * Listing also kicks off the deletion job in the background (at most every 5 minutes).
 */
export async function GET(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  runVerificationCleanupOpportunistically()

  const view = new URL(request.url).searchParams.get('view') === 'recent' ? 'recent' : 'pending'
  try {
    const now = Date.now()
    const [pending, recent, dashboard] = await Promise.all([
      listSubmissionsByStatus(['pending'], 300, 'asc'),
      view === 'recent' ? listSubmissionsByStatus(null, 150, 'desc') : Promise.resolve(null),
      getDeletionDashboard(new Date(now)),
    ])
    const rows = recent ?? pending
    const submissions = []
    // Small batches: each row reads its post from Storage.
    for (let i = 0; i < rows.length; i += 10) {
      submissions.push(...(await Promise.all(rows.slice(i, i + 10).map((row) => shape(row, now)))))
    }
    return NextResponse.json({
      view,
      pendingCount: pending.length,
      staleCount: submissions.filter((s) => s.stale).length,
      submissions,
      dashboard,
      generatedAt: new Date(now).toISOString(),
    })
  } catch (error) {
    if (error instanceof ReviewDocStoreError && error.setupRequired) {
      return NextResponse.json({ error: error.message, setupRequired: true }, { status: 503 })
    }
    console.error('Internal verifications list error:', error)
    return NextResponse.json({ error: 'Failed to load verifications.' }, { status: 500 })
  }
}
