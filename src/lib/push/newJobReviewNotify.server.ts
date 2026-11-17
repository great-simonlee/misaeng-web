import { BRAND_CONFIG } from '@lib/brand'
import type { CommunityPost } from '@/types/nyc'
import { notifyUsersInChunks } from './notify.server'
import { claimFirstTime } from './postEngagementNotify.server'
import { listPushUserIds } from './store.server'

/*
 * "미생 · 면접/취업 후기 — 새로운 면접/취업 후기가 올라왔어요!" — to every Misaeng app user, once per review, when a
 * job review becomes public (right away, or when its held post is approved). Never to its author. Users can turn it
 * off with the `job_review` switch (My → Notifications). Tapping opens the review (data.type = new_job_review).
 * Once per post: notification_dedupe key `broadcast:job_review:<postId>` (a missing table means no broadcast, so an
 * edit / re-approval can never send it twice).
 */

export function notifyNewJobReview(post: Pick<CommunityPost, 'id' | 'categoryId' | 'authorUid'> & { pendingApproval?: boolean }) {
  // Only misaeng.com serves the app; an Ellieo-side review is not pushed to Misaeng app users.
  if (BRAND_CONFIG.id !== 'misaeng') return
  if (post.categoryId !== 'job-review' || !post.id || post.id.startsWith('mock-') || post.pendingApproval) return
  void run(post).catch((error) => console.error('New job review push error:', error))
}

async function run(post: Pick<CommunityPost, 'id' | 'authorUid'>) {
  const author = post.authorUid?.trim() || ''
  // One broadcast per author per day (2026-11-17 review: posting, deleting and posting again pushed everyone each time)
  const day = new Date().toISOString().slice(0, 10)
  if (author && !(await claimFirstTime(`broadcast:job_review_author:${author}:${day}`))) return
  if (!(await claimFirstTime(`broadcast:job_review:${post.id}`))) return
  const userIds = (await listPushUserIds()).filter((uid) => uid !== author)
  notifyUsersInChunks({
    type: 'job_review',
    userIds,
    build: (t) => ({
      title: t('api.push.newJobReview.title'),
      body: t('api.push.newJobReview.body'),
      data: { type: 'new_job_review', postId: post.id, boardId: 'job-review', board: 'job-review' },
      threadId: 'new-job-review',
    }),
  })
}
