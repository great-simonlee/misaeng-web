import {
  cityPath,
  DEFAULT_CITY_ID,
  getCityFromPathname,
  localePrefixOf,
} from '@lib/constants/cities'

/** 글·댓글 작성에 필요한 학생/직장인 인증 게이트 */

export type SchoolVerificationProfile = {
  schoolEmailVerified?: boolean | null
  verifiedSchoolId?: string | null
  occupationType?: string | null
  workplaceStatus?: string | null
  accountType?: string | null
} | null

export function isSchoolVerified(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return Boolean(profile?.schoolEmailVerified)
}

export function isWorkplaceApproved(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return profile?.workplaceStatus === 'approved'
}

export function isIdentityVerified(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return isSchoolVerified(profile) || isWorkplaceApproved(profile)
}

/** 학생 초대 링크로 가입한 학부모 계정 (학교·직장 인증 없이 허용된 일만 할 수 있다) */
export function isParentAccount(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return profile?.accountType === 'parent'
}

/** 직장 인증(회사 이메일 확인 또는 서류 제출)을 냈고 아직 승인 전 */
export function isWorkplacePending(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return profile?.workplaceStatus === 'pending'
}

/**
 * 글쓰기 게이트 (1.0.7): 학교 인증 · 직장 승인 · 직장 인증 대기(보류 글) · 학부모(질문·자유만).
 * 게시판 제한은 canParentWriteBoard, 보류 여부는 isWriteHeldForApproval.
 */
export function canWritePosts(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return (
    isIdentityVerified(profile) ||
    isWorkplacePending(profile) ||
    isParentAccount(profile)
  )
}

/** 학교 인증 없이 직장 인증만 대기 중 → 새 글은 승인 전까지 본인에게만 보이는 보류 글 */
export function isWriteHeldForApproval(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return (
    !isSchoolVerified(profile) &&
    !isWorkplaceApproved(profile) &&
    !isParentAccount(profile) &&
    isWorkplacePending(profile)
  )
}

/** 학부모 계정은 질문·자유(anonymous)에만 글을 쓴다 */
export const PARENT_WRITE_BOARD = 'anonymous'

export function canWriteOnBoard(
  profile: SchoolVerificationProfile | undefined,
  boardId: string,
): boolean {
  if (!canWritePosts(profile)) return false
  if (isParentAccount(profile)) return boardId === PARENT_WRITE_BOARD
  return true
}

/** 댓글: 학교 인증 · 직장 승인 · 학부모. 직장 인증 대기만으로는 못 쓴다 */
export function canComment(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return isIdentityVerified(profile) || isParentAccount(profile)
}

/** 승인 대기 중에 동시에 둘 수 있는 보류 글 수 */
export const HELD_POST_LIMIT = 3

export const HELD_POST_LIMIT_CODE = 'HELD_POST_LIMIT'
export const WORKPLACE_PENDING_COMMENT_CODE = 'WORKPLACE_PENDING_COMMENT'
export const PARENT_BOARD_NOT_ALLOWED_CODE = 'PARENT_BOARD_NOT_ALLOWED'
export const PARENT_NOT_ALLOWED_CODE = 'PARENT_NOT_ALLOWED'

export function prefersWorkplaceVerification(): boolean {
  return false
}

export function isAccountSuspended(
  profile: { status?: string | null } | null | undefined,
): boolean {
  return profile?.status === 'suspended'
}

export const ACCOUNT_SUSPENDED_CODE = 'ACCOUNT_SUSPENDED'

export const SCHOOL_VERIFY_REQUIRED_CODE = 'SCHOOL_VERIFICATION_REQUIRED'

/** 마이페이지에서 인증 시트를 여는 URL */
export function getSchoolVerifyHref(nextPath?: string): string {
  return getIdentityVerifyHref(nextPath)
}

/** 마이페이지 인증 시트: identity = 고르는 시트, school / workplace(회사 이메일) / workplaceDocs(재직·전 직장 서류) */
export type IdentityVerifyKind = 'identity' | 'school' | 'workplace' | 'workplaceDocs'

export function getIdentityVerifyHref(nextPath?: string, kind: IdentityVerifyKind = 'identity'): string {
  const params = new URLSearchParams()
  params.set('verify', kind)
  if (nextPath?.trim()) {
    params.set('next', nextPath.trim())
  }
  const city = nextPath?.trim()
    ? getCityFromPathname(nextPath)
    : DEFAULT_CITY_ID
  return `${localePrefixOf(nextPath)}${cityPath(city, '/me')}?${params.toString()}`
}
