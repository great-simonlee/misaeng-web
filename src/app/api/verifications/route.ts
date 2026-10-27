import { NextResponse } from 'next/server'

import { getClientIp, getClientUserAgent } from '@lib/consent/requestMeta'
import { getRequestLocale, getT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import {
  ReviewDocStoreError,
  appendVerificationConsentLog,
  countRecentSubmissions,
  createSubmission,
  deleteVerificationObject,
  isReviewDocStoreConfigured,
  listSubmissionsForUser,
  newId,
  patchSubmission,
  toOwnerSubmission,
  uploadVerificationObject,
  type SubmissionWithFiles,
} from '@lib/supabase/reviewVerification.server'
import {
  REVIEW_DOC_CONSENT_VERSION,
  REVIEW_DOC_DAILY_LIMIT,
  REVIEW_DOC_MAX_BYTES,
  REVIEW_DOC_MAX_FILES,
  REVIEW_DOC_MIME_TYPES,
  isReviewDocKind,
  kindsForBoard,
  reviewDocBoardFor,
  type ReviewDocListResponse,
  type ReviewDocPostEligibility,
} from '@lib/verification/reviewDocs'
import { DocumentRejectedError, sanitizeDocument, type SanitizedDocument } from '@lib/verification/sanitizeDocument.server'
import { deleteSubmissionFilesNow } from '@lib/verification/reviewDocsService.server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 3 files × 10 MB + re-encoding
export const maxDuration = 60

const LIMITS = {
  maxFiles: REVIEW_DOC_MAX_FILES,
  maxBytes: REVIEW_DOC_MAX_BYTES,
  consentVersion: REVIEW_DOC_CONSENT_VERSION,
  mimeTypes: REVIEW_DOC_MIME_TYPES,
}
const DAY = 24 * 60 * 60 * 1000

function storeErrorResponse(error: unknown, t: Translate) {
  if (error instanceof ReviewDocStoreError && error.setupRequired) {
    return NextResponse.json({ error: t('reviewDocs.notReady'), code: 'SETUP_REQUIRED' }, { status: 503 })
  }
  console.error('Verification documents error:', error)
  return NextResponse.json({ error: t('reviewDocs.failed') }, { status: 500 })
}

function eligibilityFor(
  postId: string,
  post: { authorUid: string; categoryId: string } | null,
  uid: string,
  submissions: SubmissionWithFiles[],
  recentCount: number,
): ReviewDocPostEligibility {
  const isAuthor = Boolean(post && post.authorUid === uid)
  const board = post ? reviewDocBoardFor(post.categoryId) : null
  const kinds = board ? [...kindsForBoard(board)] : []
  let blockedReason: string | null = null
  if (!isAuthor) blockedReason = 'not_author'
  else if (!board) blockedReason = 'board'
  else if (submissions.some((s) => s.status === 'approved')) blockedReason = 'approved'
  else if (submissions.some((s) => s.status === 'pending')) blockedReason = 'pending'
  else if (recentCount >= REVIEW_DOC_DAILY_LIMIT) blockedReason = 'daily_limit'
  return { postId, isAuthor, board, kinds: isAuthor ? kinds : [], canSubmit: blockedReason === null, blockedReason }
}

/** GET /api/verifications[?postId=] — my submissions (+ whether I can verify that post). */
export async function GET(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  if (!isReviewDocStoreConfigured()) {
    return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
  }

  const postId = new URL(request.url).searchParams.get('postId')?.trim() || ''
  try {
    const submissions = await listSubmissionsForUser(user.uid)
    const body: ReviewDocListResponse = { submissions: submissions.map(toOwnerSubmission), limits: LIMITS }
    if (postId) {
      const [post, recent] = await Promise.all([
        getStoredCommunityPost(postId),
        countRecentSubmissions(user.uid, new Date(Date.now() - DAY).toISOString()),
      ])
      const forPost = submissions.filter((s) => s.post_id === postId)
      body.post = eligibilityFor(postId, post, user.uid, forPost, recent)
      body.submissions = forPost.map(toOwnerSubmission)
    }
    return NextResponse.json(body)
  } catch (error) {
    return storeErrorResponse(error, t)
  }
}

/**
 * POST /api/verifications (multipart/form-data)
 *   postId, kind, consent=true, consentVersion=<REVIEW_DOC_CONSENT_VERSION>, files (1–3; jpg/png/pdf ≤ 10 MB each)
 * → 201 { submission }
 */
export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended
  if (!isReviewDocStoreConfigured()) {
    return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > REVIEW_DOC_MAX_FILES * REVIEW_DOC_MAX_BYTES + 512 * 1024) {
    return NextResponse.json({ error: t('reviewDocs.fileTooLarge') }, { status: 413 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: t('reviewDocs.invalidRequest') }, { status: 400 })
  }

  const postId = String(form.get('postId') || '').trim()
  const kind = String(form.get('kind') || '').trim()
  const consent = String(form.get('consent') || '').trim() === 'true'
  const consentVersion = String(form.get('consentVersion') || '').trim()
  const source = String(form.get('source') || 'web').trim()
  const files = [...form.getAll('files'), ...form.getAll('file')].filter((f): f is File => f instanceof File)

  // Required separate consent (spec 6.3), to the notice version shown right now.
  if (!consent || consentVersion !== REVIEW_DOC_CONSENT_VERSION) {
    return NextResponse.json({ error: t('reviewDocs.consentRequired'), code: 'CONSENT_REQUIRED' }, { status: 400 })
  }
  if (!postId || !isReviewDocKind(kind)) {
    return NextResponse.json({ error: t('reviewDocs.invalidRequest') }, { status: 400 })
  }
  if (files.length === 0) return NextResponse.json({ error: t('reviewDocs.fileRequired') }, { status: 400 })
  if (files.length > REVIEW_DOC_MAX_FILES) {
    return NextResponse.json({ error: t('reviewDocs.tooManyFiles', { max: REVIEW_DOC_MAX_FILES }) }, { status: 400 })
  }
  if (files.some((f) => f.size > REVIEW_DOC_MAX_BYTES)) {
    return NextResponse.json({ error: t('reviewDocs.fileTooLarge') }, { status: 413 })
  }

  try {
    // Own post only, on a board that takes verifications, with a kind that fits the board.
    const post = await getStoredCommunityPost(postId)
    if (!post) return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
    const existing = (await listSubmissionsForUser(user.uid, postId)).filter((s) => s.post_id === postId)
    const recent = await countRecentSubmissions(user.uid, new Date(Date.now() - DAY).toISOString())
    const eligibility = eligibilityFor(postId, post, user.uid, existing, recent)
    if (!eligibility.isAuthor) return NextResponse.json({ error: t('common.forbidden') }, { status: 403 })
    if (!eligibility.board) return NextResponse.json({ error: t('reviewDocs.boardNotEligible') }, { status: 400 })
    if (!eligibility.kinds.includes(kind)) return NextResponse.json({ error: t('reviewDocs.invalidRequest') }, { status: 400 })
    if (eligibility.blockedReason === 'approved') {
      return NextResponse.json({ error: t('reviewDocs.alreadyVerified'), code: 'ALREADY_VERIFIED' }, { status: 409 })
    }
    if (eligibility.blockedReason === 'pending') {
      return NextResponse.json({ error: t('reviewDocs.alreadyPending'), code: 'ALREADY_PENDING' }, { status: 409 })
    }
    if (eligibility.blockedReason === 'daily_limit') {
      return NextResponse.json({ error: t('reviewDocs.dailyLimit') }, { status: 429 })
    }

    // Detect the type from the bytes, strip metadata (re-encode), hash. Nothing is stored before all files pass.
    const cleaned: SanitizedDocument[] = []
    for (const file of files) {
      try {
        cleaned.push(await sanitizeDocument(Buffer.from(await file.arrayBuffer()), REVIEW_DOC_MAX_BYTES))
      } catch (error) {
        if (error instanceof DocumentRejectedError) {
          const key =
            error.code === 'heic'
              ? 'reviewDocs.heicNotSupported'
              : error.code === 'tooLarge'
                ? 'reviewDocs.fileTooLarge'
                : error.code === 'invalidImage'
                  ? 'reviewDocs.invalidImage'
                  : 'reviewDocs.unsupportedType'
          return NextResponse.json({ error: t(key) }, { status: error.code === 'tooLarge' ? 413 : 415 })
        }
        throw error
      }
    }

    const consentLogId = await appendVerificationConsentLog({
      userId: user.uid,
      consentVersion,
      uiLanguage: locale,
      source: source === 'ios' || source === 'android' ? source : 'web',
      postId,
      ipAddress: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    // Paths carry no user id, name or file name.
    const submissionId = newId()
    const uploadedAt = new Date()
    const stored = cleaned.map((doc) => {
      const id = newId()
      return { id, doc, storagePath: `${submissionId}/${id}.${doc.extension}` }
    })

    // Rows first (so the hourly job can always find every object), then the objects.
    try {
      await createSubmission({
        id: submissionId,
        userId: user.uid,
        postId,
        board: eligibility.board,
        kind,
        uploadedAt,
        consentLogId,
        consentVersion,
        files: stored.map((s) => ({
          id: s.id,
          storagePath: s.storagePath,
          mimeType: s.doc.mimeType,
          sizeBytes: s.doc.bytes.length,
          sha256: s.doc.sha256,
        })),
      })
    } catch (error) {
      if (error instanceof ReviewDocStoreError && error.status === 409) {
        return NextResponse.json({ error: t('reviewDocs.alreadyPending'), code: 'ALREADY_PENDING' }, { status: 409 })
      }
      throw error
    }

    try {
      for (const s of stored) await uploadVerificationObject(s.storagePath, s.doc.bytes, s.doc.mimeType)
    } catch (error) {
      // Roll back: withdraw and delete whatever made it to Storage (confirmed + logged as upload_failed).
      const withdrawn = await patchSubmission(submissionId, { status: 'withdrawn' }).catch(() => null)
      if (withdrawn) {
        await deleteSubmissionFilesNow(
          {
            ...withdrawn,
            verification_files: stored.map((s) => ({
              id: s.id,
              submission_id: submissionId,
              storage_path: s.storagePath,
              mime_type: s.doc.mimeType,
              size_bytes: s.doc.bytes.length,
              sha256: s.doc.sha256,
              uploaded_at: uploadedAt.toISOString(),
              deleted_at: null,
              delete_attempts: 0,
              last_delete_error: null,
              last_delete_attempt_at: null,
            })),
          },
          'upload_failed',
          { notify: false },
        ).catch(() => undefined)
      } else {
        for (const s of stored) await deleteVerificationObject(s.storagePath).catch(() => undefined)
      }
      throw error
    }

    const [row] = (await listSubmissionsForUser(user.uid, postId)).filter((s) => s.id === submissionId)
    return NextResponse.json({ submission: row ? toOwnerSubmission(row) : null }, { status: 201 })
  } catch (error) {
    return storeErrorResponse(error, t)
  }
}
