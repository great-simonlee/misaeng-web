import type { AnonBadgeKind } from '@/types/nyc'

/**
 * 1.0.7 — 직장 인증 대기 중에 쓴 보류 글과 익명 글 배지 종류. 서버·화면이 같이 쓴다 (서버 전용 흐름은 heldPosts.server.ts).
 */

export const ANON_BADGE_KINDS = ['student', 'workplace', 'parent'] as const

export function isAnonBadgeKind(value: unknown): value is AnonBadgeKind {
  return typeof value === 'string' && (ANON_BADGE_KINDS as readonly string[]).includes(value)
}

/** 승인 전 보류 글 (작성자에게만 보인다) */
export function isHeldPost(post: { pendingApproval?: boolean | null } | null | undefined): boolean {
  return post?.pendingApproval === true
}

/** 보류 글은 직장 인증이 거절되고 이 기간이 지나면 지운다 */
export const HELD_POST_REJECTED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 새 익명 글·댓글에 남길 배지 종류: 학부모 → 학교 인증(학생) → 직장(승인 또는 대기: 보류 글은 승인 뒤에만 공개된다).
 * 학교 이름은 절대 남기지 않는다. 아무 인증도 없으면 null.
 */
export function anonBadgeKindFor(
  profile:
    | {
        accountType?: string | null
        schoolEmailVerified?: boolean | null
        workplaceStatus?: string | null
      }
    | null
    | undefined,
): AnonBadgeKind | null {
  if (profile?.accountType === 'parent') return 'parent'
  if (profile?.schoolEmailVerified) return 'student'
  if (profile?.workplaceStatus === 'approved' || profile?.workplaceStatus === 'pending') return 'workplace'
  return null
}
