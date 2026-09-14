export const WORKPLACE_COMPANY_MAX = 40

export const WORKPLACE_VERIFICATION_STATUSES = [
  'none',
  'pending',
  'approved',
  'rejected',
] as const

export type WorkplaceVerificationStatus =
  (typeof WORKPLACE_VERIFICATION_STATUSES)[number]

/** 직장 메일로 쓸 수 없는 개인 도메인 */
export const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.kr',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'kakao.com',
  'nate.com',
] as const

export function isWorkplaceVerificationStatus(
  value: string | null | undefined,
): value is WorkplaceVerificationStatus {
  return (
    typeof value === 'string' &&
    (WORKPLACE_VERIFICATION_STATUSES as readonly string[]).includes(value)
  )
}

export function normalizeWorkplaceStatus(
  value: unknown,
): WorkplaceVerificationStatus {
  return isWorkplaceVerificationStatus(String(value || ''))
    ? (value as WorkplaceVerificationStatus)
    : 'none'
}
