import { randomUUID } from 'node:crypto'

import {
  REVIEW_DOC_AFTER_DECISION_HOURS,
  REVIEW_DOC_MAX_RETENTION_HOURS,
  isReviewDocKind,
  isReviewDocRejectReason,
  type ReviewDocKind,
  type ReviewDocMimeType,
  type ReviewDocRejectReason,
  type ReviewDocStatus,
  type ReviewDocSubmission,
} from '@lib/verification/reviewDocs'
import { OFFER_VERIFIED_TTL_MS, TtlCache } from '@lib/supabase/listCache.server'

/*
 * Review verification documents (supabase/verification.sql): tables through PostgREST and files in the private
 * bucket `verification-private` through Storage REST, both with the service role key, server-side only.
 * Missing tables (SQL not run yet) raise ReviewDocStoreError with setupRequired = true.
 */

export const VERIFICATION_BUCKET = 'verification-private'
const HOUR = 60 * 60 * 1000

export type DeletionMethod =
  | 'auto_after_decision'
  | 'auto_expired'
  | 'user_request'
  | 'admin'
  | 'account_deletion'
  | 'upload_failed'

export type SubmissionRow = {
  id: string
  user_id: string
  post_id: string | null
  board: string | null
  kind: ReviewDocKind
  status: ReviewDocStatus
  uploaded_at: string
  decided_at: string | null
  decided_by: string | null
  reject_reason: string | null
  result_label: string | null
  delete_due_at: string
  deleted_at: string | null
  deletion_notified_at: string | null
  consent_log_id: string
  consent_version: string
}

export type FileRow = {
  id: string
  submission_id: string
  storage_path: string
  mime_type: ReviewDocMimeType
  size_bytes: number
  sha256: string
  uploaded_at: string
  deleted_at: string | null
  delete_attempts: number
  last_delete_error: string | null
  last_delete_attempt_at: string | null
}

export type SubmissionWithFiles = SubmissionRow & { verification_files: FileRow[] }

export class ReviewDocStoreError extends Error {
  constructor(
    message: string,
    readonly setupRequired = false,
    readonly status = 500,
  ) {
    super(message)
  }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}

export function isReviewDocStoreConfigured() {
  return Boolean(config())
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const c = config()
  if (!c) throw new ReviewDocStoreError('Supabase is not configured.', true, 503)
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code
    if (code === 'PGRST205' || code === '42P01' || code === '42501' || code === '42704') {
      throw new ReviewDocStoreError('Run supabase/verification.sql in the Supabase SQL Editor.', true, 503)
    }
    if (code === '23505') throw new ReviewDocStoreError('duplicate', false, 409)
    throw new ReviewDocStoreError(`Verification store request failed (${res.status}).`)
  }
  return data as T
}

const enc = encodeURIComponent

// MARK: storage

function storageUrl(path: string) {
  const c = config()
  if (!c) throw new ReviewDocStoreError('Supabase is not configured.', true, 503)
  return { url: `${c.url}/storage/v1/${path}`, key: c.key }
}

function objectPath(storagePath: string) {
  return storagePath.split('/').map(enc).join('/')
}

export async function uploadVerificationObject(storagePath: string, bytes: Buffer, mimeType: string) {
  const { url, key } = storageUrl(`object/${VERIFICATION_BUCKET}/${objectPath(storagePath)}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
      'cache-control': 'no-store',
    },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null)
  if (!res?.ok) {
    const body = await res?.text().catch(() => '')
    if (body && /bucket not found/i.test(body)) {
      throw new ReviewDocStoreError(`Create the private bucket "${VERIFICATION_BUCKET}" (supabase/verification.sql).`, true, 503)
    }
    throw new ReviewDocStoreError(`Verification upload failed (${res?.status ?? 'network'}).`)
  }
}

/** Deletes one object. A missing object counts as deleted. */
export async function deleteVerificationObject(storagePath: string) {
  const { url, key } = storageUrl(`object/${VERIFICATION_BUCKET}`)
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [storagePath] }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)
  if (!res) throw new Error('storage delete: network error')
  if (!res.ok && res.status !== 404) throw new Error(`storage delete: HTTP ${res.status}`)
}

/** Reads the same path back: true only when Storage says the object does not exist (404 / not_found). */
export async function confirmVerificationObjectGone(storagePath: string): Promise<boolean> {
  // Same authenticated GET a reader would use; Range keeps it to one byte if the object somehow still exists.
  const { url, key } = storageUrl(`object/${VERIFICATION_BUCKET}/${objectPath(storagePath)}`)
  const res = await fetch(url, {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: 'bytes=0-0' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (!res) return false
  if (res.status === 404) return true
  if (res.ok || res.status === 206) {
    await res.body?.cancel().catch(() => undefined)
    return false
  }
  const body = (await res.text().catch(() => '')).toLowerCase()
  // Storage answers some missing objects with 400 + {"statusCode":"404","error":"not_found"}
  return body.includes('not_found') || body.includes('"404"') || body.includes('object not found')
}

/** 60-second signed URL for one object (ERP viewer only). */
export async function createVerificationSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const { url, key } = storageUrl(`object/sign/${VERIFICATION_BUCKET}/${objectPath(storagePath)}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  const data = (await res?.json().catch(() => null)) as { signedURL?: string; signedUrl?: string } | null
  const signed = data?.signedURL || data?.signedUrl
  if (!res?.ok || !signed) throw new ReviewDocStoreError(`Signed URL failed (${res?.status ?? 'network'}).`)
  const base = config()!.url
  return signed.startsWith('http') ? signed : `${base}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`
}

// MARK: consent (same Storage JSON store as the other consent logs: legal/*)

const CONSENT_BUCKET_DEFAULT = 'housing'
const CONSENT_BUCKET_FALLBACK = 'avatars'
const CONSENT_PREFIX = 'legal/verification-consent-logs/'

async function consentBucket() {
  const preferred = process.env.SUPABASE_HOUSING_BUCKET?.trim() || CONSENT_BUCKET_DEFAULT
  for (const bucket of [preferred, CONSENT_BUCKET_FALLBACK]) {
    const { url, key } = storageUrl(`bucket/${bucket}`)
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)
    if (res?.ok) return bucket
  }
  return preferred
}

/**
 * Appends the "verification document processing" consent (spec 6.3, the 5.6 notice) to the consent log store and
 * returns its id, which the submission keeps as `consent_log_id`.
 */
export async function appendVerificationConsentLog(input: {
  userId: string
  consentVersion: string
  uiLanguage: string
  source: 'web' | 'ios' | 'android'
  postId: string
  ipAddress: string | null
  userAgent: string | null
}): Promise<string> {
  const consentedAt = new Date().toISOString()
  const id = `verification_${consentedAt.replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`
  const log = {
    id,
    user_id: input.userId,
    consent_type: 'verification_documents',
    consent_version: input.consentVersion,
    ui_language: input.uiLanguage,
    source: input.source,
    post_id: input.postId,
    consented_at: consentedAt,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
  }
  const bucket = await consentBucket()
  const { url, key } = storageUrl(`object/${bucket}/${CONSENT_PREFIX}${id}.json`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)
  if (!res?.ok) throw new ReviewDocStoreError(`Consent log save failed (${res?.status ?? 'network'}).`)
  return id
}

// MARK: submissions

const SUBMISSION_FIELDS =
  'id,user_id,post_id,board,kind,status,uploaded_at,decided_at,decided_by,reject_reason,result_label,delete_due_at,deleted_at,deletion_notified_at,consent_log_id,consent_version'
const FILE_FIELDS =
  'id,submission_id,storage_path,mime_type,size_bytes,sha256,uploaded_at,deleted_at,delete_attempts,last_delete_error,last_delete_attempt_at'
const WITH_FILES = `${SUBMISSION_FIELDS},verification_files(${FILE_FIELDS})`

export function maxRetentionFrom(uploadedAt: Date | string) {
  return new Date(new Date(uploadedAt).getTime() + REVIEW_DOC_MAX_RETENTION_HOURS * HOUR)
}

/** min(decided_at + 72h, uploaded_at + 7d) */
export function deleteDueAfterDecision(uploadedAt: string, decidedAt: Date) {
  const afterDecision = decidedAt.getTime() + REVIEW_DOC_AFTER_DECISION_HOURS * HOUR
  return new Date(Math.min(afterDecision, maxRetentionFrom(uploadedAt).getTime()))
}

export async function createSubmission(input: {
  id: string
  userId: string
  postId: string
  board: string
  kind: ReviewDocKind
  uploadedAt: Date
  consentLogId: string
  consentVersion: string
  files: { id: string; storagePath: string; mimeType: ReviewDocMimeType; sizeBytes: number; sha256: string }[]
}) {
  await rest('verification_submissions', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      id: input.id,
      user_id: input.userId,
      post_id: input.postId,
      board: input.board,
      kind: input.kind,
      status: 'pending',
      uploaded_at: input.uploadedAt.toISOString(),
      delete_due_at: maxRetentionFrom(input.uploadedAt).toISOString(),
      consent_log_id: input.consentLogId,
      consent_version: input.consentVersion,
    }),
  })
  await rest('verification_files', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(
      input.files.map((file) => ({
        id: file.id,
        submission_id: input.id,
        storage_path: file.storagePath,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        sha256: file.sha256,
        uploaded_at: input.uploadedAt.toISOString(),
      })),
    ),
  })
}

export async function getSubmission(id: string): Promise<SubmissionWithFiles | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await rest<SubmissionWithFiles[]>(`verification_submissions?id=eq.${enc(id)}&select=${WITH_FILES}`)
  return rows?.[0] ?? null
}

export async function listSubmissionsForUser(userId: string, postId?: string): Promise<SubmissionWithFiles[]> {
  const post = postId ? `&post_id=eq.${enc(postId)}` : ''
  return (
    (await rest<SubmissionWithFiles[]>(
      `verification_submissions?user_id=eq.${enc(userId)}${post}&select=${WITH_FILES}&order=uploaded_at.desc&limit=100`,
    )) ?? []
  )
}

/**
 * Whether a post has an approved verification. For the points claims: a claim created after the approval can add
 * its `verified` component from this (false when the SQL isn't run yet).
 */
export async function hasApprovedVerification(postId: string): Promise<boolean> {
  const rows = await rest<{ id: string }[]>(
    `verification_submissions?post_id=eq.${enc(postId)}&status=eq.approved&select=id&limit=1`,
  ).catch(() => null)
  return Boolean(rows?.length)
}

/** postId:authorUid → the author has an approved offer verification for that post. Cached briefly per instance. */
const offerVerifiedCache = new TtlCache<boolean>(OFFER_VERIFIED_TTL_MS, 5000)
/** Post ids per PostgREST `in.(...)` request (keeps the URL short on long lists). */
const OFFER_VERIFIED_CHUNK = 100

/**
 * Ids of the posts whose author has an approved 'offer' verification for that same post ("합격 인증" badge).
 * One batched query for the uncached posts. Nothing else from the submission leaves this function.
 * Missing tables or Supabase config = feature off (no badges); other failures also give no badge.
 */
export async function getOfferVerifiedPostIds(
  posts: ReadonlyArray<{ id: string; authorUid?: string | null }>,
): Promise<Set<string>> {
  const candidates = posts.filter((post) => post.id && post.authorUid)
  if (!candidates.length || !isReviewDocStoreConfigured()) return new Set()

  const missing: { id: string; authorUid: string }[] = []
  let batch: Promise<Set<string>> | undefined
  // Every cache miss registers itself synchronously below; the batch runs once they all have.
  const loadBatch = () =>
    (batch ??= Promise.resolve().then(async () => {
      const approved = new Set<string>()
      for (let i = 0; i < missing.length; i += OFFER_VERIFIED_CHUNK) {
        const ids = missing.slice(i, i + OFFER_VERIFIED_CHUNK).map((post) => `"${post.id.replace(/"/g, '')}"`)
        const rows = await rest<{ post_id: string | null; user_id: string }[]>(
          `verification_submissions?post_id=in.(${enc(ids.join(','))})&kind=eq.offer&status=eq.approved&select=post_id,user_id`,
        ).catch((error: unknown) => {
          if (error instanceof ReviewDocStoreError && error.setupRequired) return []
          throw error
        })
        for (const row of rows ?? []) if (row.post_id) approved.add(`${row.post_id}:${row.user_id}`)
      }
      return approved
    }))

  const results = await Promise.all(
    candidates.map((post) => {
      const key = `${post.id}:${post.authorUid}`
      return offerVerifiedCache
        .get(key, () => {
          missing.push({ id: post.id, authorUid: post.authorUid as string })
          return loadBatch().then((approved) => approved.has(key))
        })
        .then((verified) => (verified ? post.id : null))
        .catch(() => null)
    }),
  )
  return new Set(results.filter((id): id is string => Boolean(id)))
}

export async function countRecentSubmissions(userId: string, sinceIso: string) {
  const rows = await rest<{ id: string }[]>(
    `verification_submissions?user_id=eq.${enc(userId)}&uploaded_at=gte.${enc(sinceIso)}&select=id`,
  )
  return rows?.length ?? 0
}

export async function listSubmissionsByStatus(
  statuses: ReviewDocStatus[] | null,
  limit = 200,
  order: 'asc' | 'desc' = 'asc',
): Promise<SubmissionWithFiles[]> {
  const filter = statuses?.length ? `&status=in.(${statuses.join(',')})` : ''
  return (
    (await rest<SubmissionWithFiles[]>(
      `verification_submissions?select=${WITH_FILES}${filter}&order=uploaded_at.${order}&limit=${Math.min(Math.max(limit, 1), 500)}`,
    )) ?? []
  )
}

export async function patchSubmission(
  id: string,
  patch: Partial<SubmissionRow>,
  guard = '',
): Promise<SubmissionRow | null> {
  const rows = await rest<SubmissionRow[]>(`verification_submissions?id=eq.${enc(id)}${guard}&select=${SUBMISSION_FIELDS}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify(patch),
  })
  return rows?.[0] ?? null
}

/** pending + past delete_due_at (7 days after upload) → expired. Returns the rows that changed. */
export async function expireOverdueSubmissions(nowIso: string): Promise<SubmissionRow[]> {
  return (
    (await rest<SubmissionRow[]>(
      `verification_submissions?status=eq.pending&delete_due_at=lte.${enc(nowIso)}&select=${SUBMISSION_FIELDS}`,
      { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ status: 'expired' }) },
    )) ?? []
  )
}

// MARK: files

export type DueFile = FileRow & {
  verification_submissions: Pick<SubmissionRow, 'id' | 'user_id' | 'status' | 'delete_due_at' | 'uploaded_at'>
}

/** Files not yet deleted whose submission is due (delete_due_at <= now). */
export async function listDueFiles(nowIso: string, limit = 200): Promise<DueFile[]> {
  return (
    (await rest<DueFile[]>(
      `verification_files?deleted_at=is.null&select=${FILE_FIELDS},verification_submissions!inner(id,user_id,status,delete_due_at,uploaded_at)` +
        `&verification_submissions.delete_due_at=lte.${enc(nowIso)}&order=uploaded_at.asc&limit=${limit}`,
    )) ?? []
  )
}

/** Files not yet deleted (for the dashboard). */
export async function listLiveFiles(): Promise<DueFile[]> {
  return (
    (await rest<DueFile[]>(
      `verification_files?deleted_at=is.null&select=${FILE_FIELDS},verification_submissions!inner(id,user_id,status,delete_due_at,uploaded_at)&limit=1000`,
    )) ?? []
  )
}

export async function patchFile(id: string, patch: Partial<FileRow>) {
  await rest(`verification_files?id=eq.${enc(id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(patch),
  })
}

export async function countLiveFiles(submissionId: string) {
  const rows = await rest<{ id: string }[]>(
    `verification_files?submission_id=eq.${enc(submissionId)}&deleted_at=is.null&select=id`,
  )
  return rows?.length ?? 0
}

// MARK: logs

export async function insertDeletionLog(entry: {
  submissionId: string
  fileId: string
  method: DeletionMethod
  storageConfirmed: boolean
  deletedAt: string
}) {
  await rest('verification_deletion_log', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      submission_id: entry.submissionId,
      file_id: entry.fileId,
      method: entry.method,
      storage_confirmed: entry.storageConfirmed,
      deleted_at: entry.deletedAt,
    }),
  })
}

export async function countDeletionsSince(sinceIso: string) {
  const rows = await rest<{ id: string }[]>(
    `verification_deletion_log?deleted_at=gte.${enc(sinceIso)}&select=id&limit=5000`,
  )
  return rows?.length ?? 0
}

export async function insertAccessLog(entry: { submissionId: string; fileId: string; reviewerEmail: string }) {
  await rest('verification_access_log', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      submission_id: entry.submissionId,
      file_id: entry.fileId,
      reviewer_email: entry.reviewerEmail,
      action: 'view_signed_url',
    }),
  })
}

export async function listAccessLog(submissionId: string) {
  return (
    (await rest<{ reviewer_email: string; file_id: string; accessed_at: string }[]>(
      `verification_access_log?submission_id=eq.${enc(submissionId)}&select=reviewer_email,file_id,accessed_at&order=accessed_at.desc&limit=50`,
    )) ?? []
  )
}

// MARK: shaping

export function toOwnerSubmission(row: SubmissionWithFiles): ReviewDocSubmission {
  const files = Array.isArray(row.verification_files) ? row.verification_files : []
  return {
    id: row.id,
    postId: row.post_id,
    board: row.board,
    kind: isReviewDocKind(row.kind) ? row.kind : 'interview',
    status: row.status,
    uploadedAt: row.uploaded_at,
    decidedAt: row.decided_at,
    deleteDueAt: row.delete_due_at,
    deletedAt: row.deleted_at,
    rejectReason: isReviewDocRejectReason(row.reject_reason) ? (row.reject_reason as ReviewDocRejectReason) : null,
    resultLabel: row.status === 'approved' ? row.result_label : null,
    fileCount: files.length,
    filesRemaining: files.filter((f) => !f.deleted_at).length,
  }
}

export function newId() {
  return randomUUID()
}
