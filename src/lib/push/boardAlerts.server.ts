import { BRAND_CONFIG } from '@lib/brand'
import { resolvePostCity } from '@lib/constants/cities'
import type { CommunityPost } from '@/types/nyc'
import { notifyUsersInChunks } from './notify.server'
import { claimFirstTime } from './postEngagementNotify.server'
import { boardAlertSubscribers } from './store.server'

/*
 * 새 글 알림 (owner 2026-11-23): "미생 · 맛집 — 새 맛집 글이 올라왔어요" only to users who switched that board ON in
 * My → Notifications (push_board_alerts, supabase/push_new_post_alerts.sql). Everyone starts with every board OFF
 * (the old always-on job review broadcast is gone). Sent once per post when it becomes public (right away, or when a
 * held post is approved), never to its author, at most one per author per board per day. 질문·자유 texts never name the
 * author. Tapping opens the post (data.type = new_board_post). Missing table → nobody subscribed → nothing is sent.
 */

export const BOARD_ALERT_BOARDS = ['food', 'roommate', 'status', 'job-review', 'anonymous'] as const
export type BoardAlertBoard = (typeof BOARD_ALERT_BOARDS)[number]

export const isBoardAlertBoard = (value: unknown): value is BoardAlertBoard =>
  (BOARD_ALERT_BOARDS as readonly unknown[]).includes(value)

/** i18n key segment: api.push.newBoardPost.<key> */
const TEXT_KEY: Record<BoardAlertBoard, string> = {
  food: 'food',
  roommate: 'roommate',
  status: 'status',
  'job-review': 'jobReview',
  anonymous: 'anonymous',
}

export function notifyNewBoardPost(
  post: Pick<CommunityPost, 'id' | 'categoryId' | 'authorUid'> & { pendingApproval?: boolean; city?: CommunityPost['city'] },
) {
  // Only misaeng.com serves the app
  if (BRAND_CONFIG.id !== 'misaeng') return
  const board = post.categoryId
  if (!isBoardAlertBoard(board) || !post.id || post.id.startsWith('mock-') || post.pendingApproval) return
  void run(board, post).catch((error) => console.error('New board post push error:', error))
}

async function run(board: BoardAlertBoard, post: Pick<CommunityPost, 'id' | 'authorUid'> & { city?: CommunityPost['city'] }) {
  const author = post.authorUid?.trim() || ''
  const userIds = (await boardAlertSubscribers(board)).filter((uid) => uid !== author)
  if (userIds.length === 0) return
  // One per author per board per day (posting, deleting and posting again must not push everyone each time)
  const day = new Date().toISOString().slice(0, 10)
  if (author && !(await claimFirstTime(`broadcast:board_post_author:${board}:${author}:${day}`))) return
  if (!(await claimFirstTime(`broadcast:board_post:${post.id}`))) return
  const key = TEXT_KEY[board]
  const city = post.city ? resolvePostCity(post.city) : null
  notifyUsersInChunks({
    // 'account' = no push_preferences switch applies: the audience already opted in for this board
    type: 'account',
    userIds,
    build: (t) => ({
      title: t(`api.push.newBoardPost.${key}.title`),
      body: t(`api.push.newBoardPost.${key}.body`),
      data: { type: 'new_board_post', postId: post.id, boardId: board, board, ...(city ? { city } : {}) },
      threadId: `new-board-post-${board}`,
    }),
  })
}
