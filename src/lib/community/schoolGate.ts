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

export function getIdentityVerifyHref(nextPath?: string): string {
  const params = new URLSearchParams()
  params.set('verify', 'identity')
  if (nextPath?.trim()) {
    params.set('next', nextPath.trim())
  }
  const city = nextPath?.trim()
    ? getCityFromPathname(nextPath)
    : DEFAULT_CITY_ID
  return `${localePrefixOf(nextPath)}${cityPath(city, '/me')}?${params.toString()}`
}
