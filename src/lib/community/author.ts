import type { CommunityPost } from '@/types/nyc'

type AuthorFields = Pick<CommunityPost, 'authorNickname' | 'authorEmail'>

/** 게시글 작성자 표시명 — 닉네임 우선, 없으면 이메일 @ 앞부분 */
export function getCommunityAuthorDisplayName(
  post: AuthorFields,
): string {
  return (
    post.authorNickname?.trim() ||
    post.authorEmail.split('@')[0]?.trim() ||
    '회원'
  )
}
