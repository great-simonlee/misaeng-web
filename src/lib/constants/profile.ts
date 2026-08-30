export const MIN_NICKNAME_LEN = 2
export const MAX_NICKNAME_LEN = 20

/** 영문 알파벳, 점(.)만 허용 */
export const NICKNAME_ALLOWED_PATTERN = /^[A-Za-z.]+$/
export const NICKNAME_CHAR_FILTER = /[^A-Za-z.]/g

export const NICKNAME_RULE_HINT =
  '영문 알파벳과 "." 만 사용할 수 있어요'

export function sanitizeNicknameInput(value: string): string {
  return value.replace(NICKNAME_CHAR_FILTER, '').slice(0, MAX_NICKNAME_LEN)
}

export function getNicknameValidationError(
  value: string,
): string | null {
  const nickname = value.trim()
  if (nickname.length < MIN_NICKNAME_LEN) {
    return `닉네임은 ${MIN_NICKNAME_LEN}자 이상이어야 해요`
  }
  if (nickname.length > MAX_NICKNAME_LEN) {
    return `닉네임은 ${MAX_NICKNAME_LEN}자까지예요`
  }
  if (!NICKNAME_ALLOWED_PATTERN.test(nickname)) {
    return NICKNAME_RULE_HINT
  }
  return null
}

export function isValidNickname(value: string): boolean {
  return getNicknameValidationError(value) === null
}

export const PROFILE_GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
] as const

export const PROFILE_OCCUPATION_OPTIONS = [
  { value: 'student', label: '학생' },
  { value: 'professional', label: '직장인' },
  { value: 'other', label: '기타' },
] as const

export type ProfileGender = (typeof PROFILE_GENDER_OPTIONS)[number]['value']
export type ProfileOccupationType =
  (typeof PROFILE_OCCUPATION_OPTIONS)[number]['value']

export function getProfileGenderLabel(value: string | null | undefined) {
  if (!value) return null
  return (
    PROFILE_GENDER_OPTIONS.find((option) => option.value === value)?.label ??
    null
  )
}

export function getProfileOccupationLabel(value: string | null | undefined) {
  if (!value) return null
  return (
    PROFILE_OCCUPATION_OPTIONS.find((option) => option.value === value)?.label ??
    null
  )
}

export function isProfileGender(value: string): value is ProfileGender {
  return PROFILE_GENDER_OPTIONS.some((option) => option.value === value)
}

export function isProfileOccupationType(
  value: string,
): value is ProfileOccupationType {
  return PROFILE_OCCUPATION_OPTIONS.some((option) => option.value === value)
}
