import { NextResponse } from 'next/server'

import {
  createVerificationSignedUrl,
  getSubmission,
  insertAccessLog,
  isReviewDocStoreConfigured,
} from '@lib/supabase/reviewVerification.server'
import { isVerificationInternalRequest, reviewerEmailFrom } from '@lib/verification/internalAuth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXPIRES_IN = 60

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/internal/verifications/{id}/file  { fileId, reviewerEmail }  (ellieo-erp, header x-internal-secret)
 * → { url, expiresIn: 60, mimeType }
 * Every call is written to verification_access_log first; no log, no URL. Deleted files (incl. "delete now") and
 * withdrawn submissions never get a URL.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isReviewDocStoreConfigured()) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { id } = await context.params
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const fileId = String(body.fileId || '').trim()
  const reviewerEmail = reviewerEmailFrom(body.reviewerEmail)
  if (!fileId || !reviewerEmail) {
    return NextResponse.json({ error: 'fileId and reviewerEmail are required.' }, { status: 400 })
  }

  try {
    const submission = await getSubmission(String(id || '').trim())
    const file = submission?.verification_files?.find((f) => f.id === fileId)
    if (!submission || !file) return NextResponse.json({ error: 'File not found.' }, { status: 404 })
    if (file.deleted_at || submission.deleted_at || submission.status === 'withdrawn') {
      return NextResponse.json({ error: 'This file has been deleted.' }, { status: 410 })
    }
    if (new Date(submission.delete_due_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This file is past its deletion time and is being deleted.' }, { status: 410 })
    }

    await insertAccessLog({ submissionId: submission.id, fileId: file.id, reviewerEmail })
    const url = await createVerificationSignedUrl(file.storage_path, EXPIRES_IN)
    return NextResponse.json(
      { url, expiresIn: EXPIRES_IN, mimeType: file.mime_type },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Internal verification file URL error:', error)
    return NextResponse.json({ error: 'Failed to open the file.' }, { status: 500 })
  }
}
