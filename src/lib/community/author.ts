import type { Translate } from '@lib/i18n/translate'
import type { CommunityComment, CommunityPost } from '@/types/nyc'

/** 닉네임이 없을 때 표시명. `t`는 community 네임스페이스 번역기 */
function memberLabel(t: Translate): string {
  return t('author.member')
}

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
  fallbackNickname: string | null | undefined,
  t: Translate,
): string {
  return (
    sanitizeCommunityNickname(post.authorNickname, post.authorEmail) ||
    sanitizeCommunityNickname(fallbackNickname, post.authorEmail) ||
    memberLabel(t)
  )
}

/** 댓글 작성자 표시명 — 저장된 닉네임, 없으면 폴백 닉네임 */
export function getCommentAuthorDisplayName(
  comment: CommentAuthorFields,
  fallbackNickname: string | null | undefined,
  t: Translate,
): string {
  return (
    sanitizeCommunityNickname(comment.authorNickname, comment.authorEmail) ||
    sanitizeCommunityNickname(fallbackNickname, comment.authorEmail) ||
    memberLabel(t)
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

const HANGUL_OR_CJK = /[ᄀ-ᇿ㄰-㆏가-힣぀-ヿ一-鿿]/

/**
 * 프로필 사진이 없을 때 아바타에 쓰는 이니셜 (앱과 같은 규칙).
 * 한글·한자·가나 이름은 첫 글자 하나, 그 밖에는 단어(공백·.·@로 나눔, 직원 앱 InitialsAvatar와 같음) 두 개까지의 첫 글자 (Simon Lee → SL).
 * 이름이 없으면 빈 문자열 — 화면은 기본 프로필 아이콘을 보여 준다.
 */
export function avatarInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() || ''
  if (!trimmed) return ''
  if (HANGUL_OR_CJK.test(trimmed)) return Array.from(trimmed)[0] ?? ''
  const words = trimmed.split(/[\s.@]+/).filter(Boolean).slice(0, 2)
  return words
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
}
