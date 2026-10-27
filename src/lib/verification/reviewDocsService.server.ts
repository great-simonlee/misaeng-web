import { after } from 'next/server'

import { notifyErpVerificationDocuments } from '@lib/erp/notifyVerificationDocuments'
import { onReviewDocumentVerified } from '@lib/points/facade.server'
import { notifyUsers } from '@lib/push/notify.server'
import {
  confirmVerificationObjectGone,
  countDeletionsSince,
  countLiveFiles,
  deleteVerificationObject,
  expireOverdueSubmissions,
  insertDeletionLog,
  listDueFiles,
  listLiveFiles,
  listSubmissionsForUser,
  patchFile,
  patchSubmission,
  type DeletionMethod,
  type FileRow,
  type SubmissionRow,
} from '@lib/supabase/reviewVerification.server'

/*
 * Deleting verification files (spec 5.4) and the ERP deletion dashboard.
 * Every deletion: delete the Storage object → read the same path back and require 404 → mark the file deleted →
 * write verification_deletion_log → when the submission has no files left, mark it deleted and push the user.
 */

const RETRIES = 3
/** The hourly job may run up to an hour after a file became due; anything later than this is "overdue". */
export const OVERDUE_GRACE_MINUTES = 70
const MINUTE = 60 * 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type FileDeleteResult = { fileId: string; ok: boolean; error?: string }

/** Deletes one file with up to 3 attempts. Only a confirmed 404 counts as deleted. */
export async function deleteFileConfirmed(
  file: Pick<FileRow, 'id' | 'submission_id' | 'storage_path' | 'delete_attempts'>,
  method: DeletionMethod,
): Promise<FileDeleteResult> {
  let lastError = ''
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await deleteVerificationObject(file.storage_path)
      if (await confirmVerificationObjectGone(file.storage_path)) {
        const deletedAt = new Date().toISOString()
        await patchFile(file.id, { deleted_at: deletedAt, last_delete_error: null, last_delete_attempt_at: deletedAt })
        await insertDeletionLog({
          submissionId: file.submission_id,
          fileId: file.id,
          method,
          storageConfirmed: true,
          deletedAt,
        })
        return { fileId: file.id, ok: true }
      }
      lastError = 'object still readable after delete'
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    if (attempt < RETRIES) await sleep(400 * attempt)
  }
  await patchFile(file.id, {
    delete_attempts: (file.delete_attempts || 0) + 1,
    last_delete_error: lastError.slice(0, 300),
    last_delete_attempt_at: new Date().toISOString(),
  }).catch(() => undefined)
  return { fileId: file.id, ok: false, error: lastError }
}

/**
 * When a submission has no files left: set deleted_at (once) and push the user (once).
 * `expired` = deleted because nobody reviewed it within 7 days (the push asks the user to submit again).
 */
async function finalizeSubmission(submission: Pick<SubmissionRow, 'id' | 'user_id' | 'status'>, notify: boolean) {
  if ((await countLiveFiles(submission.id)) > 0) return null
  const deletedAt = new Date().toISOString()
  const row = await patchSubmission(submission.id, { deleted_at: deletedAt }, '&deleted_at=is.null')
  if (!row) return null
  if (notify) {
    const marked = await patchSubmission(
      submission.id,
      { deletion_notified_at: deletedAt },
      '&deletion_notified_at=is.null',
    ).catch(() => null)
    if (marked) notifyDeletion(row.user_id, row.id, deletedAt, row.status === 'expired')
  }
  return row
}

function formatDeletedAt(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function notifyDeletion(userId: string, submissionId: string, deletedAt: string, expired: boolean) {
  notifyUsers({
    type: 'account',
    userIds: [userId],
    build: (t, locale) => ({
      title: t(expired ? 'api.push.reviewDocs.expired.title' : 'api.push.reviewDocs.deleted.title'),
      body: t(expired ? 'api.push.reviewDocs.expired.body' : 'api.push.reviewDocs.deleted.body', {
        date: formatDeletedAt(deletedAt, locale),
      }),
      data: { type: 'verificationDocuments', submissionId },
      threadId: 'verification-documents',
    }),
  })
}

/** Deletes every remaining file of one submission now (user request, admin, account deletion). */
export async function deleteSubmissionFilesNow(
  submission: SubmissionRow & { verification_files: FileRow[] },
  method: DeletionMethod,
  { notify = true }: { notify?: boolean } = {},
) {
  const live = (submission.verification_files || []).filter((f) => !f.deleted_at)
  const results: FileDeleteResult[] = []
  for (const file of live) results.push(await deleteFileConfirmed(file, method))
  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    // The hourly job retries them right away (due now).
    await patchSubmission(submission.id, { delete_due_at: new Date().toISOString() }).catch(() => undefined)
    return { deleted: results.length - failed.length, failed: failed.length, submission: null }
  }
  const row = await finalizeSubmission(submission, notify)
  return { deleted: results.length, failed: 0, submission: row }
}

/**
 * Spec 10.3: on an account deletion request, all verification files are deleted immediately.
 * For the account-deletion flow: `await deleteAllVerificationFilesForUser(uid)`.
 */
export async function deleteAllVerificationFilesForUser(userId: string) {
  const submissions = await listSubmissionsForUser(userId)
  let deleted = 0
  let failed = 0
  for (const submission of submissions) {
    if (submission.status === 'pending') {
      await patchSubmission(submission.id, { status: 'withdrawn' }, '&status=eq.pending').catch(() => undefined)
    }
    if (!(submission.verification_files || []).some((f) => !f.deleted_at)) continue
    const result = await deleteSubmissionFilesNow(submission, 'account_deletion', { notify: false })
    deleted += result.deleted
    failed += result.failed
  }
  return { deleted, failed }
}

// MARK: hourly cleanup

export type CleanupSummary = {
  ranAt: string
  expired: number
  deleted: number
  failed: number
  overdue: number
  submissionsCompleted: number
}

let running: Promise<CleanupSummary> | null = null
let lastOpportunisticRun = 0

/** Spec 5.4 steps 1–6. One run at a time per server instance. */
export function runVerificationCleanup(): Promise<CleanupSummary> {
  running ??= runCleanup().finally(() => {
    running = null
  })
  return running
}

/** Called when the ERP lists the queue: at most every 5 minutes, never blocks the caller. */
export function runVerificationCleanupOpportunistically() {
  if (Date.now() - lastOpportunisticRun < 5 * MINUTE) return
  lastOpportunisticRun = Date.now()
  const run = () =>
    runVerificationCleanup()
      .then(() => undefined)
      .catch((error) => console.error('Verification cleanup (opportunistic) failed:', error))
  try {
    after(run)
  } catch {
    void run()
  }
}

async function runCleanup(): Promise<CleanupSummary> {
  const now = new Date()
  const nowIso = now.toISOString()

  // 1a. Unreviewed for 7 days → expired (deleted below with method auto_expired).
  const expired = await expireOverdueSubmissions(nowIso)

  // 1b. Files whose submission is due.
  const due = await listDueFiles(nowIso, 300)
  const failures: { fileId: string; submissionId: string; error?: string; attempts: number }[] = []
  const touched = new Map<string, Pick<SubmissionRow, 'id' | 'user_id' | 'status'>>()
  let deleted = 0

  for (const file of due) {
    const submission = file.verification_submissions
    const method: DeletionMethod =
      submission.status === 'expired' || submission.status === 'pending'
        ? 'auto_expired'
        : submission.status === 'withdrawn'
          ? 'user_request'
          : 'auto_after_decision'
    // 2–5. delete, confirm 404, mark deleted, log
    const result = await deleteFileConfirmed(file, method)
    touched.set(submission.id, { id: submission.id, user_id: submission.user_id, status: submission.status })
    if (result.ok) deleted += 1
    else failures.push({ fileId: file.id, submissionId: submission.id, error: result.error, attempts: file.delete_attempts + 1 })
  }

  // 4 + 6. Submissions with nothing left → deleted_at, push the user.
  let submissionsCompleted = 0
  for (const submission of touched.values()) {
    const row = await finalizeSubmission(submission, true).catch(() => null)
    if (row) submissionsCompleted += 1
  }

  // Failures after 3 retries → ERP alert (ids only).
  if (failures.length) {
    await notifyErpVerificationDocuments({
      title: 'Verification file deletion failed',
      body: `${failures.length} file(s) could not be deleted after ${RETRIES} retries. Files: ${failures
        .slice(0, 10)
        .map((f) => `${f.fileId} (attempt ${f.attempts})`)
        .join(', ')}. Open Misaeng → Verifications → Deletion.`,
    })
  }

  // Overdue (kept past the deletion time) must always be 0.
  const overdue = (await listLiveFiles()).filter(
    (f) => new Date(f.verification_submissions.delete_due_at).getTime() < now.getTime() - OVERDUE_GRACE_MINUTES * MINUTE,
  )
  if (overdue.length) {
    await notifyErpVerificationDocuments({
      title: 'Verification files kept past deletion time',
      body: `${overdue.length} file(s) are past their deletion time. Open Misaeng → Verifications → Deletion now.`,
    })
  }

  return {
    ranAt: nowIso,
    expired: expired.length,
    deleted,
    failed: failures.length,
    overdue: overdue.length,
    submissionsCompleted,
  }
}

// MARK: dashboard (ERP)

/** Start of today in New York (the team's day), as an ISO instant. */
export function startOfTodayNewYork(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const offset = wall - Math.floor(now.getTime() / 1000) * 1000
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offset).toISOString()
}

export type DeletionDashboard = {
  deletedToday: number
  /** files waiting for their deletion time */
  due: number
  nextDueAt: string | null
  /** files whose last deletion run failed (still retried every hour) */
  failed: number
  /** files kept past their deletion time — must always be 0 */
  overdue: number
  overdueFiles: { fileId: string; submissionId: string; deleteDueAt: string; attempts: number; lastError: string | null }[]
  failedFiles: { fileId: string; submissionId: string; attempts: number; lastError: string | null; lastAttemptAt: string | null }[]
}

export async function getDeletionDashboard(now = new Date()): Promise<DeletionDashboard> {
  const [live, deletedToday] = await Promise.all([listLiveFiles(), countDeletionsSince(startOfTodayNewYork(now))])
  const limit = now.getTime() - OVERDUE_GRACE_MINUTES * MINUTE
  const overdue = live.filter((f) => new Date(f.verification_submissions.delete_due_at).getTime() < limit)
  const failed = live.filter((f) => f.delete_attempts > 0)
  const upcoming = live
    .map((f) => f.verification_submissions.delete_due_at)
    .filter((d) => new Date(d).getTime() >= now.getTime())
    .sort()
  return {
    deletedToday,
    due: live.length - overdue.length,
    nextDueAt: upcoming[0] ?? null,
    failed: failed.length,
    overdue: overdue.length,
    overdueFiles: overdue.slice(0, 50).map((f) => ({
      fileId: f.id,
      submissionId: f.submission_id,
      deleteDueAt: f.verification_submissions.delete_due_at,
      attempts: f.delete_attempts,
      lastError: f.last_delete_error,
    })),
    failedFiles: failed.slice(0, 50).map((f) => ({
      fileId: f.id,
      submissionId: f.submission_id,
      attempts: f.delete_attempts,
      lastError: f.last_delete_error,
      lastAttemptAt: f.last_delete_attempt_at,
    })),
  }
}

// MARK: points

/**
 * A verification was approved → the post's points claim gets its `verified` component (spec 3.2), through the
 * points facade (src/lib/points/facade.server.ts, see src/lib/points/WIRING.md). The hook never throws.
 */
export async function awardVerifiedComponent(input: { postId: string | null; submissionId: string; actor: string }) {
  if (!input.postId) return
  const result = await onReviewDocumentVerified({ postId: input.postId, actor: input.actor })
  if (!result.ok) {
    console.error(`[verification docs] verified component for ${input.submissionId} failed: ${result.error}`)
  }
}
