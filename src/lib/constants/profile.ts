export const MIN_NICKNAME_LEN = 3
export const MAX_NICKNAME_LEN = 20

/**
 * Misaeng and Ellieo share member profiles, so one rule for both (owner 2026-11-25):
 * English letters and "." only, 3–20, no "." at the start or end, no "..".
 * Older nicknames (e.g. Hangul) stay until the member picks a new one in the reset modal.
 */
export const NICKNAME_ALLOWED_PATTERN = /^[A-Za-z.]+$/
export const NICKNAME_CHAR_FILTER = /[^A-Za-z.]/g

export function sanitizeNicknameInput(value: string): string {
  return value.replace(NICKNAME_CHAR_FILTER, '').slice(0, MAX_NICKNAME_LEN)
}

export type NicknameValidationIssue =
  | { code: 'tooShort'; min: number }
  | { code: 'tooLong'; max: number }
  | { code: 'invalidChars' }
  | { code: 'dotEdge' }
  | { code: 'doubleDot' }

/** 형식 오류 코드. 화면은 `me.nickname.errors.<code>`, API는 `profile.nickname.<code>`로 번역한다 (min·max를 params로 넘긴다). */
export function getNicknameValidationIssue(
  value: string,
): NicknameValidationIssue | null {
  const nickname = value.trim()
  if (nickname.length < MIN_NICKNAME_LEN) {
    return { code: 'tooShort', min: MIN_NICKNAME_LEN }
  }
  if (nickname.length > MAX_NICKNAME_LEN) {
    return { code: 'tooLong', max: MAX_NICKNAME_LEN }
  }
  if (!NICKNAME_ALLOWED_PATTERN.test(nickname)) {
    return { code: 'invalidChars' }
  }
  if (nickname.startsWith('.') || nickname.endsWith('.')) {
    return { code: 'dotEdge' }
  }
  if (nickname.includes('..')) {
    return { code: 'doubleDot' }
  }
  return null
}

export function isValidNickname(value: string): boolean {
  return getNicknameValidationIssue(value) === null
}

/** A saved nickname from before the English-only rule (Hangul, too short …) → the member must pick a new one. */
export function nicknameNeedsReset(value: string | null | undefined): boolean {
  const nickname = (value || '').trim()
  return nickname.length > 0 && !isValidNickname(nickname)
}

/** 표시 문구는 `me.profile.gender.<value>` */
export const PROFILE_GENDER_VALUES = ['male', 'female', 'other'] as const

/** 표시 문구는 `me.profile.occupation.<value>` */
export const PROFILE_OCCUPATION_VALUES = [
  'student',
  'professional',
  'other',
] as const

export type ProfileGender = (typeof PROFILE_GENDER_VALUES)[number]
export type ProfileOccupationType = (typeof PROFILE_OCCUPATION_VALUES)[number]

export function isProfileGender(value: string): value is ProfileGender {
  return (PROFILE_GENDER_VALUES as readonly string[]).includes(value)
}

export function isProfileOccupationType(
  value: string,
): value is ProfileOccupationType {
  return (PROFILE_OCCUPATION_VALUES as readonly string[]).includes(value)
}
