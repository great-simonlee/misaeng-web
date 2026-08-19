export const MIN_NICKNAME_LEN = 2
export const MAX_NICKNAME_LEN = 20

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
