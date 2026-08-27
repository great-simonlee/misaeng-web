/** 글·댓글 작성에 필요한 학교 이메일 인증 게이트 */

export type SchoolVerificationProfile = {
  schoolEmailVerified?: boolean | null
  verifiedSchoolId?: string | null
} | null

export function isSchoolVerified(
  profile: SchoolVerificationProfile | undefined,
): boolean {
  return Boolean(profile?.schoolEmailVerified)
}

export const SCHOOL_VERIFY_REQUIRED_CODE = 'SCHOOL_VERIFICATION_REQUIRED'

export const SCHOOL_VERIFY_REQUIRED_MESSAGE =
  '글과 댓글을 작성하려면 학교 이메일 인증이 필요해요.'

/** 마이페이지에서 학교 인증 시트를 여는 URL */
export function getSchoolVerifyHref(nextPath?: string): string {
  const params = new URLSearchParams()
  params.set('verify', 'school')
  if (nextPath?.trim()) {
    params.set('next', nextPath.trim())
  }
  return `/nyc/me?${params.toString()}`
}
