/**
 * 하우징 찜 — postLikes 호환 래퍼
 * @deprecated 새 코드는 `@lib/utils/postLikes` 사용
 */

import {
  getLikedEntries,
  isPostLiked,
  subscribePostLikes,
  togglePostLike,
} from '@lib/utils/postLikes'

export function getLikedHousingIds(): string[] {
  return getLikedEntries()
    .filter((entry) => entry.kind === 'housing')
    .map((entry) => entry.id)
}

export function isHousingLiked(postId: string): boolean {
  return isPostLiked({ kind: 'housing', id: postId })
}

/** @returns 좋아요 후 상태 */
export function toggleHousingLike(postId: string): boolean {
  return togglePostLike({ kind: 'housing', id: postId })
}

export function subscribeHousingLikes(onChange: () => void): () => void {
  return subscribePostLikes(onChange)
}
