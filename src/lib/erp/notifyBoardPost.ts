import { sendStaffPush, SUPER_ADMIN_EMAIL } from '@lib/support/staffPush.server'
import { oneLineTitle } from '@lib/erp/notifyJobReview'
import type { CommunityPost } from '@/types/nyc'

/** Boards whose new posts alert the Super Admin (`status` = OPT · 비자 · 영주권; `cpt-opt` is its older id). */
const BOARD_NAMES: Record<string, { board: string; name: string }> = {
  food: { board: 'food', name: 'Food' },
  status: { board: 'status', name: 'Visa' },
  'cpt-opt': { board: 'status', name: 'Visa' },
}

/**
 * A new 맛집 or 비자 post → a push in the Misaeng ERP app to the Super Admin only (owner decision 2026-11-08):
 *   New Food Post
 *   <post title>
 *   Joe's Pizza · by nickname
 * Tap → Misaeng › Content opens the post. Staff posts are not skipped, so the Super Admin can test it. Never throws.
 */
export async function notifyBoardPostCreated(
  post: Pick<CommunityPost, 'id' | 'categoryId' | 'title' | 'placeName' | 'authorNickname'>,
): Promise<void> {
  const board = BOARD_NAMES[post.categoryId]
  if (!board) return
  try {
    const nickname = post.authorNickname?.trim()
    await sendStaffPush([SUPER_ADMIN_EMAIL], {
      title: `New ${board.name} Post`,
      subtitle: oneLineTitle(post.title),
      body: [post.placeName?.trim(), nickname ? `by ${nickname}` : ''].filter(Boolean).join(' · ') || 'Tap to open the post',
      threadId: `board-${board.board}`,
      data: { type: 'post', board: board.board, postId: post.id },
    })
  } catch (error) {
    console.error('[board post push] error:', error)
  }
}
