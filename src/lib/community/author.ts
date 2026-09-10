import type { CommunityComment, CommunityPost } from '@/types/nyc'

type AuthorFields = Pick<CommunityPost, 'authorNickname'> & {
  authorEmail?: string | null
}

type CommentAuthorFields = Pick<CommunityComment, 'authorNickname'> & {
  authorEmail?: string | null
}

/**
 * 커뮤니티 작성자 표시명.
 * 닉네임만 사용하고, 이메일 아이디(@ 앞부분)는 절대 노출하지 않는다.
 */
export function getCommunityAuthorDisplayName(post: AuthorFields): string {
  return post.authorNickname?.trim() || '회원'
}

/** 댓글 작성자 표시명 — 닉네임 우선, 이메일 아이디 미사용 */
export function getCommentAuthorDisplayName(
  comment: CommentAuthorFields,
): string {
  return comment.authorNickname?.trim() || '회원'
}

function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

/** 프로필에서 커뮤니티용 닉네임 후보 (이메일·이메일형 문자열 제외) */
export function resolveCommunityNickname(profile: {
  nickname?: string | null
  displayName?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
} | null | undefined): string | null {
  const nickname = profile?.nickname?.trim()
  if (nickname && !looksLikeEmail(nickname)) return nickname

  const displayName =
    profile?.displayName?.trim() || profile?.name?.trim() || ''
  if (displayName && !looksLikeEmail(displayName)) return displayName

  const fullName = [profile?.firstName, profile?.lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
  if (fullName && !looksLikeEmail(fullName)) return fullName

  return null
}
