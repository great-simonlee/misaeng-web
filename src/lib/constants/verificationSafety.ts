/**
 * 인증(SMS/이메일) 비용·남용 방지 상수.
 * 프론트 가드는 우회 가능하므로, 운영에서는 Supabase RLS·Edge Function 등을 함께 쓰세요.
 */

export function isPhoneSmsEnabled(): boolean {
  // 기본 OFF — 명시적으로 켤 때만 실제 SMS 발송
  return process.env.NEXT_PUBLIC_ENABLE_PHONE_SMS === 'true'
}

export function isSchoolOtpEnabled(): boolean {
  // 학교 메일은 기본 ON, 끄려면 false
  return process.env.NEXT_PUBLIC_ENABLE_SCHOOL_OTP !== 'false'
}

/** true면 allowlist 번호만 허용 (실SMS 비용 차단용) */
export function isPhoneTestOnly(): boolean {
  return (
    process.env.NEXT_PUBLIC_PHONE_TEST_ONLY === 'true' ||
    process.env.NODE_ENV === 'development'
  )
}

export function getPhoneTestAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_PHONE_TEST_NUMBERS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 휴대폰 인증 전 학교 이메일 인증 필수 여부 */
export const REQUIRE_SCHOOL_BEFORE_PHONE = false

export const PHONE_OTP_COOLDOWN_MS = 90_000
export const SCHOOL_OTP_COOLDOWN_MS = 60_000

export const PHONE_OTP_DAILY_MAX = 2
export const SCHOOL_OTP_DAILY_MAX = 5

export const PHONE_CONFIRM_MAX_ATTEMPTS = 5
export const SCHOOL_CONFIRM_MAX_ATTEMPTS = 5

export function utcDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}
