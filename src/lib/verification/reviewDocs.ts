/**
 * Review verification documents (spec ch. 5) — shared by the API, the web upload flow and (by key names) the app.
 * Users upload an email screenshot or a photo proving their review; files are deleted within 72h after the decision
 * and never kept longer than 7 days. Only the result is kept.
 */

export const REVIEW_DOC_KINDS = ['interview', 'offer', 'opt', 'visa_approval', 'cpt'] as const
export type ReviewDocKind = (typeof REVIEW_DOC_KINDS)[number]

/** Boards whose authors can verify a review, and the document kinds that fit each board. */
export const REVIEW_DOC_KINDS_BY_BOARD = {
  'job-review': ['interview', 'offer'],
  status: ['opt', 'visa_approval', 'cpt'],
} as const satisfies Record<string, readonly ReviewDocKind[]>
export type ReviewDocBoard = keyof typeof REVIEW_DOC_KINDS_BY_BOARD

export const REVIEW_DOC_STATUSES = ['pending', 'approved', 'rejected', 'expired', 'withdrawn'] as const
export type ReviewDocStatus = (typeof REVIEW_DOC_STATUSES)[number]

/** Reject reason codes (ERP). Codes only, so no document content is ever copied into a reason. */
export const REVIEW_DOC_REJECT_REASONS = ['unreadable', 'mismatch', 'not_masked', 'wrong_document', 'other'] as const
export type ReviewDocRejectReason = (typeof REVIEW_DOC_REJECT_REASONS)[number]

export const REVIEW_DOC_MAX_FILES = 3
export const REVIEW_DOC_MAX_BYTES = 10 * 1024 * 1024
/**
 * What the web/app aim for per masked render, so 3 files fit one request on Vercel (request bodies max ~4.5 MB).
 * Screenshots are far smaller; photos are downscaled to REVIEW_DOC_RENDER_MAX_SIDE and recompressed.
 */
export const REVIEW_DOC_UPLOAD_TARGET_BYTES = 1400 * 1024
export const REVIEW_DOC_RENDER_MAX_SIDE = 2560
/** Accepted by the server. The app converts HEIC to JPEG and the web flattens images through a canvas first. */
export const REVIEW_DOC_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const
export type ReviewDocMimeType = (typeof REVIEW_DOC_MIME_TYPES)[number]

/** verification.max_retention_days (spec 5.4) */
export const REVIEW_DOC_MAX_RETENTION_HOURS = 7 * 24
/** After a decision the files are deleted within this many hours (capped by the max retention). */
export const REVIEW_DOC_AFTER_DECISION_HOURS = 72
/** Uploads per user per rolling 24 hours. */
export const REVIEW_DOC_DAILY_LIMIT = 5

/**
 * Version of the pre-upload notice (spec 5.6, `me.reviewDocs.notice.body`). The client must send exactly this value
 * with `consent=true`; change it whenever the notice text changes.
 */
export const REVIEW_DOC_CONSENT_VERSION = 'verification-docs-2026-10'

/** Pending reviews older than this are highlighted in the ERP queue. */
export const REVIEW_DOC_STALE_HOURS = 5 * 24

export function isReviewDocKind(value: unknown): value is ReviewDocKind {
  return typeof value === 'string' && (REVIEW_DOC_KINDS as readonly string[]).includes(value)
}

export function isReviewDocRejectReason(value: unknown): value is ReviewDocRejectReason {
  return typeof value === 'string' && (REVIEW_DOC_REJECT_REASONS as readonly string[]).includes(value)
}

/** `status` and the merged CPT/OPT/visa/green-card ids all count as the visa board. */
export function reviewDocBoardFor(categoryId: string | null | undefined): ReviewDocBoard | null {
  if (categoryId === 'job-review') return 'job-review'
  if (categoryId === 'status' || categoryId === 'cpt-opt' || categoryId === 'visa' || categoryId === 'green-card') {
    return 'status'
  }
  return null
}

export function kindsForBoard(board: ReviewDocBoard): readonly ReviewDocKind[] {
  return REVIEW_DOC_KINDS_BY_BOARD[board]
}

/** One submission as the owner sees it (GET /api/verifications). No storage paths, no hashes. */
export type ReviewDocSubmission = {
  id: string
  postId: string | null
  board: string | null
  kind: ReviewDocKind
  status: ReviewDocStatus
  uploadedAt: string
  decidedAt: string | null
  deleteDueAt: string
  deletedAt: string | null
  rejectReason: ReviewDocRejectReason | null
  resultLabel: string | null
  fileCount: number
  filesRemaining: number
}

/** GET /api/verifications?postId= → whether the signed-in user can verify that post. */
export type ReviewDocPostEligibility = {
  postId: string
  isAuthor: boolean
  board: ReviewDocBoard | null
  kinds: ReviewDocKind[]
  canSubmit: boolean
  /** why not: 'not_author' | 'board' | 'pending' | 'approved' | 'daily_limit' */
  blockedReason: string | null
}

export type ReviewDocListResponse = {
  submissions: ReviewDocSubmission[]
  post?: ReviewDocPostEligibility
  limits: { maxFiles: number; maxBytes: number; consentVersion: string; mimeTypes: readonly string[] }
}
