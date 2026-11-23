import { notifyBoardPostCreated } from '@lib/erp/notifyBoardPost'
import { notifyJobReviewCreated } from '@lib/erp/notifyJobReview'
import { notifyNewBoardPost } from '@lib/push/boardAlerts.server'
import { syncAutoMentor } from '@lib/points/coffeeChatMentors.server'
import { notifyUsers } from '@lib/push/notify.server'
import {
  deleteStoredCommunityPost,
  getStoredCommunityPost,
  getStoredJobReviewSource,
  listStoredHeldPosts,
  patchStoredCommunityPost,
} from '@lib/supabase/community.server'

import { HELD_POST_REJECTED_RETENTION_MS } from './heldPosts'

/**
 * 직장 인증 대기 중에 쓴 보류 글 (spec 1.0.7 §1).
 *   * 승인(ERP) 또는 학교 인증 → publishHeldPosts: 공개 시각을 createdAt으로, 그때 포인트·ERP 알림을 보낸다.
 *   * 거절 → markHeldPostsRejected: 계속 숨김, 30일 뒤 cleanupRejectedHeldPosts가 지운다 (내 글 목록에서 lazy +
 *     /api/internal/workplace/held-cleanup).
 *   * 다시 제출(회사 이메일·서류) → clearHeldRejection: 삭제 예정을 없애고 다음 승인 때 공개.
 * 실패해도 던지지 않는다 (승인 처리 자체는 막지 않는다).
 */

export type PublishHeldResult = { published: number; postIds: string[] }

export async function publishHeldPosts(uid: string): Promise<PublishHeldResult> {
  const held = await listStoredHeldPosts(uid).catch(() => [])
  const postIds: string[] = []
  for (const item of held.sort((a, b) => a.createdAt - b.createdAt)) {
    // 같은 순서를 지키려고 1ms씩 (목록은 createdAt/updatedAt 순)
    const now = Date.now() + postIds.length
    const ok = await patchStoredCommunityPost(item.id, {
      pendingApproval: false,
      heldRejectedAt: null,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    }).catch(() => false)
    if (!ok) continue
    postIds.push(item.id)
    const post = await getStoredCommunityPost(item.id).catch(() => null)
    if (!post) continue
    try {
      // 포인트는 공개될 때 (보류 중에는 주지 않았다)
      const { onPostCreated } = await import('@lib/points/facade.server')
      await onPostCreated({ uid, post })
    } catch (error) {
      console.error('Held post points error:', error)
    }
    void notifyBoardPostCreated(post).catch(() => undefined)
    // 승인되어 공개된 순간: 그 게시판 새 글 알림을 켠 사람에게만 (한 번)
    notifyNewBoardPost({ ...post, pendingApproval: false })
    if (post.categoryId === 'job-review') {
      if (post.jobReviewMentorConsent) void syncAutoMentor(uid)
      const source = await getStoredJobReviewSource(post.id).catch(() => null)
      if (source?.source) void notifyJobReviewCreated(post, { source: source.source, orgId: source.orgId }).catch(() => undefined)
    }
  }
  return { published: postIds.length, postIds }
}

/** 거절: 보류 글은 숨긴 채로 두고 30일 뒤 삭제되도록 거절 시각을 남긴다. */
export async function markHeldPostsRejected(uid: string): Promise<number> {
  const held = await listStoredHeldPosts(uid).catch(() => [])
  const now = Date.now()
  let marked = 0
  for (const post of held) {
    if (post.heldRejectedAt) continue
    if (await patchStoredCommunityPost(post.id, { heldRejectedAt: now }).catch(() => false)) marked += 1
  }
  return marked
}

/** 다시 제출했을 때: 거절로 잡힌 삭제 예정을 없앤다 (다음 승인 때 같이 공개). */
export async function clearHeldRejection(uid: string): Promise<void> {
  const held = await listStoredHeldPosts(uid).catch(() => [])
  for (const post of held) {
    if (post.heldRejectedAt) await patchStoredCommunityPost(post.id, { heldRejectedAt: null }).catch(() => false)
  }
}

/** 거절 후 30일 지난 보류 글 삭제. uid 없으면 전체 (ERP/cron). */
export async function cleanupRejectedHeldPosts(input: { uid?: string; now?: number } = {}): Promise<number> {
  const now = input.now ?? Date.now()
  const held = await listStoredHeldPosts(input.uid)
  let deleted = 0
  for (const post of held) {
    if (!post.heldRejectedAt || now - post.heldRejectedAt < HELD_POST_REJECTED_RETENTION_MS) continue
    if (await deleteStoredCommunityPost(post.id).catch(() => false)) deleted += 1
  }
  return deleted
}

/** ERP 대기열의 "보류 글 N개" */
export async function countHeldPosts(uid: string): Promise<number> {
  return (await listStoredHeldPosts(uid).catch(() => [])).length
}

/** 승인·거절 알림 (push + 앱 알림함). data.type: workplace_approved | workplace_rejected */
export function notifyWorkplaceDecision(input: {
  uid: string
  action: 'approve' | 'reject'
  published: number
  reason?: string | null
}) {
  notifyUsers({
    type: 'account',
    userIds: [input.uid],
    build: (t) =>
      input.action === 'approve'
        ? {
            title: t('api.push.workplace.approved.title'),
            body:
              input.published > 0
                ? t('api.push.workplace.approved.bodyWithPosts', { count: input.published })
                : t('api.push.workplace.approved.body'),
            data: { type: 'workplace_approved', published: String(input.published) },
            threadId: 'workplace-verification',
          }
        : {
            title: t('api.push.workplace.rejected.title'),
            body: input.reason?.trim()
              ? t('api.push.workplace.rejected.bodyWithReason', { reason: input.reason.trim().slice(0, 120) })
              : t('api.push.workplace.rejected.body'),
            data: { type: 'workplace_rejected', published: '0' },
            threadId: 'workplace-verification',
          },
  })
}
