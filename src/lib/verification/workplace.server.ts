import { BRAND_CONFIG } from '@lib/brand'
import {
  clearHeldRejection,
  countHeldPosts,
  markHeldPostsRejected,
  notifyWorkplaceDecision,
  publishHeldPosts,
} from '@lib/community/heldPosts.server'
import type { WorkplaceKind, WorkplaceMethod } from '@lib/constants/workplace'
import { notifyErpWorkplaceVerification } from '@lib/erp/notifyWorkplaceVerification'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import {
  deleteDueAfterDecision,
  getSubmission,
  patchSubmission,
} from '@lib/supabase/reviewVerification.server'
import {
  findLatestWorkplaceVerificationByUid,
  getStoredWorkplaceVerification,
  listStoredWorkplaceVerifications,
  saveStoredWorkplaceVerification,
  type WorkplaceVerificationRequest,
} from '@lib/supabase/workplaceVerification.server'
import { sendStaffPush, SUPER_ADMIN_EMAIL } from '@lib/support/staffPush.server'
import { isReviewDocRejectReason } from '@lib/verification/reviewDocs'

/**
 * 직장 인증 (1.0.7): 회사 이메일 코드 또는 재직·전 직장 서류 → ERP 승인/거절.
 * ERP가 요청 JSON과 프로필(workplaceStatus)을 저장한 뒤 /api/internal/workplace/decision → handleWorkplaceDecision:
 * 서류 submission 결정(삭제 예정 시각), 보류 글 공개 또는 거절 표시, 인증 포인트(5P), 사용자 알림.
 */

const HOUR = 60 * 60 * 1000
export const WORKPLACE_REMINDER_AFTER_MS = 24 * HOUR

/** 새 요청 → 운영자 알림: ERP 웹 알림(기존) + 미생 ERP 앱 푸시는 Super Admin에게만 */
export function alertNewWorkplaceRequest(input: {
  request: WorkplaceVerificationRequest
  heldPosts?: number
}) {
  const { request } = input
  const kindLabel = request.workplaceKind === 'former' ? 'Former job' : 'Current job'
  const via = request.method === 'documents' ? 'Documents' : request.workEmail
  void notifyErpWorkplaceVerification({
    requestId: request.id,
    companyName: request.companyName,
    workEmail: via,
    userEmail: request.userEmail,
    userNickname: request.userNickname,
    method: request.method ?? 'email',
    workplaceKind: request.workplaceKind ?? 'current',
  })
  const nickname = request.userNickname?.trim() || request.userEmail || 'User'
  void sendStaffPush([SUPER_ADMIN_EMAIL], {
    title: 'Workplace verification request',
    subtitle: [BRAND_CONFIG.name, kindLabel, request.method === 'documents' ? 'Documents' : 'Work email'].join(' · '),
    body: `${nickname} · ${request.companyName}${input.heldPosts ? ` · ${input.heldPosts} held post(s)` : ''}`,
    threadId: 'workplace-verification',
    data: { type: 'workplace_verification', requestId: request.id, uid: request.uid },
  }).catch((error) => console.error('[workplace alert]', error))
}

/** 다시 제출할 때 (이메일 확인·서류): 거절로 잡혀 있던 보류 글 삭제 예정을 없앤다 */
export async function onWorkplaceRequestSubmitted(request: WorkplaceVerificationRequest) {
  await clearHeldRejection(request.uid).catch((error) => console.error('Held rejection clear error:', error))
  alertNewWorkplaceRequest({ request, heldPosts: await countHeldPosts(request.uid).catch(() => 0) })
}

export type WorkplaceDecisionResult = {
  ok: true
  duplicate: boolean
  status: 'approved' | 'rejected'
  publishedPosts: number
  heldPostsMarked: number
  submission: { id: string; status: string; deleteDueAt: string } | null
  points: unknown
}

/**
 * ERP가 결정을 저장한 뒤 호출. 프로필의 workplaceStatus가 기준이다 (ERP가 먼저 저장). 같은 결정으로 두 번 불러도
 * 보류 글·포인트는 한 번만 (포인트는 키로 멱등), 알림도 한 번만.
 */
export async function handleWorkplaceDecision(input: {
  uid: string
  requestId?: string | null
  action: 'approve' | 'reject'
  rejectReason?: string | null
  /** 서류 거절 사유 코드 (unreadable | mismatch | not_masked | wrong_document | other) */
  rejectReasonCode?: string | null
  reviewerEmail: string
}): Promise<WorkplaceDecisionResult> {
  const status = input.action === 'approve' ? 'approved' : 'rejected'
  const profile = await getSupabaseProfile(input.uid)
  const request =
    (input.requestId ? await getStoredWorkplaceVerification(input.requestId) : null) ??
    (await findLatestWorkplaceVerificationByUid(input.uid))
  if (request && request.uid !== input.uid) throw new Error('Request does not belong to this user.')

  const duplicate = Boolean(request?.decisionHandledAt && request.decisionHandledStatus === status)

  // 서류 submission: 결정 + 삭제 예정 = min(결정 + 72시간, 업로드 + 7일)
  let submission: WorkplaceDecisionResult['submission'] = null
  const submissionId = request?.submissionId || profile?.workplaceSubmissionId || null
  if (submissionId) {
    const row = await getSubmission(submissionId).catch(() => null)
    if (row && row.user_id === input.uid) {
      if (row.status === 'pending') {
        const decidedAt = new Date()
        const saved = await patchSubmission(
          row.id,
          {
            status,
            decided_at: decidedAt.toISOString(),
            decided_by: input.reviewerEmail,
            result_label: status === 'approved' ? (request?.companyName || profile?.workplaceCompanyName || '').slice(0, 80) || null : null,
            reject_reason:
              status === 'rejected' ? (isReviewDocRejectReason(input.rejectReasonCode) ? input.rejectReasonCode : 'other') : null,
            delete_due_at: deleteDueAfterDecision(row.uploaded_at, decidedAt).toISOString(),
          },
          '&status=eq.pending',
        ).catch((error) => {
          console.error('Workplace submission decision error:', error)
          return null
        })
        if (saved) submission = { id: saved.id, status: saved.status, deleteDueAt: saved.delete_due_at }
      } else {
        submission = { id: row.id, status: row.status, deleteDueAt: row.delete_due_at }
      }
    }
  }

  if (duplicate) {
    return { ok: true, duplicate, status, publishedPosts: 0, heldPostsMarked: 0, submission, points: null }
  }

  let publishedPosts = 0
  let heldPostsMarked = 0
  let points: unknown = null
  if (status === 'approved') {
    publishedPosts = (await publishHeldPosts(input.uid)).published
    // 직장 인증도 멘토 자격 (1.0.7): 질문·커피챗을 켜 둔 후기가 있으면 이제 멘토로 공개
    const { syncAutoMentor } = await import('@lib/points/coffeeChatMentors.server')
    await syncAutoMentor(input.uid)
    // 직장 인증 5P(현재/전 직장) + 추천인 보상 등 (facade, 멱등)
    const { onVerificationCompleted } = await import('@lib/points/facade.server')
    points = await onVerificationCompleted(input.uid, 'work_email', request?.workEmail || profile?.workEmail || null)
  } else {
    heldPostsMarked = await markHeldPostsRejected(input.uid)
  }

  notifyWorkplaceDecision({
    uid: input.uid,
    action: input.action,
    published: publishedPosts,
    reason: input.rejectReason ?? request?.rejectReason ?? null,
  })

  if (request) {
    await saveStoredWorkplaceVerification({
      ...request,
      decisionHandledAt: Date.now(),
      decisionHandledStatus: status,
    }).catch((error) => console.error('Workplace decision mark error:', error))
  }

  return { ok: true, duplicate, status, publishedPosts, heldPostsMarked, submission, points }
}

/** ERP 대기열에 붙일 정보: 보류 글 수, 서류 파일 (signed URL은 /api/internal/verifications/{id}/file) */
export async function describeWorkplaceRequest(request: WorkplaceVerificationRequest) {
  const [heldPosts, submission] = await Promise.all([
    countHeldPosts(request.uid).catch(() => 0),
    request.submissionId ? getSubmission(request.submissionId).catch(() => null) : Promise.resolve(null),
  ])
  return {
    ...request,
    method: (request.method ?? 'email') as WorkplaceMethod,
    workplaceKind: (request.workplaceKind ?? 'current') as WorkplaceKind,
    heldPosts,
    submission: submission
      ? {
          id: submission.id,
          kind: submission.kind,
          status: submission.status,
          uploadedAt: submission.uploaded_at,
          deleteDueAt: submission.delete_due_at,
          deletedAt: submission.deleted_at,
          files: (submission.verification_files ?? [])
            .sort((a, b) => a.storage_path.localeCompare(b.storage_path))
            .map((f) => ({ id: f.id, mimeType: f.mime_type, sizeBytes: f.size_bytes, deletedAt: f.deleted_at })),
        }
      : null,
  }
}

/** 24시간 넘게 처리 안 된 요청: Super Admin에게 한 번 알림 (ERP/cron이 /api/internal/workplace/reminders 호출) */
export async function sendWorkplaceReminders(now = Date.now()): Promise<number> {
  const pending = (await listStoredWorkplaceVerifications()).filter(
    (item) => item.status === 'pending' && !item.reminderSentAt && now - item.createdAt >= WORKPLACE_REMINDER_AFTER_MS,
  )
  if (pending.length === 0) return 0
  const names = pending
    .slice(0, 3)
    .map((item) => `${item.userNickname?.trim() || item.userEmail || 'User'} · ${item.companyName}`)
    .join(', ')
  await sendStaffPush([SUPER_ADMIN_EMAIL], {
    title: 'Workplace verification waiting 24h+',
    subtitle: BRAND_CONFIG.name,
    body: `${pending.length} request(s): ${names}${pending.length > 3 ? '…' : ''}`,
    threadId: 'workplace-verification',
    data: { type: 'workplace_verification' },
  }).catch((error) => console.error('[workplace reminder]', error))
  for (const item of pending) {
    await saveStoredWorkplaceVerification({ ...item, reminderSentAt: now }).catch(() => null)
  }
  return pending.length
}
