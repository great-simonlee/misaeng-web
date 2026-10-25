export const MIN_NICKNAME_LEN = 2
export const MAX_NICKNAME_LEN = 20

/** 영문 알파벳, 점(.)만 허용 */
export const NICKNAME_ALLOWED_PATTERN = /^[A-Za-z.]+$/
export const NICKNAME_CHAR_FILTER = /[^A-Za-z.]/g

export function sanitizeNicknameInput(value: string): string {
  return value.replace(NICKNAME_CHAR_FILTER, '').slice(0, MAX_NICKNAME_LEN)
}

export type NicknameValidationIssue =
  | { code: 'tooShort'; min: number }
  | { code: 'tooLong'; max: number }
  | { code: 'invalidChars' }

/** 형식 오류 코드. 화면은 `me.nickname.errors.<code>`로 번역한다 (min·max를 params로 넘긴다). */
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
  return null
}

export function isValidNickname(value: string): boolean {
  return getNicknameValidationIssue(value) === null
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
