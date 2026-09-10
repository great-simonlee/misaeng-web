import type { CommunityComment, CommunityPost } from '@/types/nyc'

type AuthorFields = Pick<CommunityPost, 'authorNickname'> & {
  authorEmail?: string | null
}

type CommentAuthorFields = Pick<CommunityComment, 'authorNickname'> & {
  authorEmail?: string | null
}

function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

/** 이메일 로컬파트·빈 값·'회원' 제외 */
export function sanitizeCommunityNickname(
  value: string | null | undefined,
  email?: string | null,
): string | null {
  const trimmed = value?.trim() || ''
  if (!trimmed || looksLikeEmail(trimmed) || trimmed === '회원') return null
  const emailLocal = email?.split('@')[0]?.trim()
  if (emailLocal && trimmed === emailLocal) return null
  return trimmed
}

/**
 * 커뮤니티 작성자 표시명.
 * 닉네임만 사용하고, 이메일 아이디(@ 앞부분)는 절대 노출하지 않는다.
 */
export function getCommunityAuthorDisplayName(
  post: AuthorFields,
  fallbackNickname?: string | null,
): string {
  return (
    sanitizeCommunityNickname(post.authorNickname, post.authorEmail) ||
    sanitizeCommunityNickname(fallbackNickname, post.authorEmail) ||
    '회원'
  )
}

/** 댓글 작성자 표시명 — 저장된 닉네임, 없으면 폴백 닉네임 */
export function getCommentAuthorDisplayName(
  comment: CommentAuthorFields,
  fallbackNickname?: string | null,
): string {
  return (
    sanitizeCommunityNickname(comment.authorNickname, comment.authorEmail) ||
    sanitizeCommunityNickname(fallbackNickname, comment.authorEmail) ||
    '회원'
  )
}

/** 프로필·계정 정보에서 커뮤니티용 닉네임 후보 (이메일형·이메일 아이디 제외) */
export function resolveCommunityNickname(
  profile: {
    nickname?: string | null
    displayName?: string | null
    name?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  } | null | undefined,
): string | null {
  const email = profile?.email
  return (
    sanitizeCommunityNickname(profile?.nickname, email) ||
    sanitizeCommunityNickname(profile?.displayName, email) ||
    sanitizeCommunityNickname(profile?.name, email) ||
    sanitizeCommunityNickname(
      [profile?.firstName, profile?.lastName]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(' '),
      email,
    )
  )
}
