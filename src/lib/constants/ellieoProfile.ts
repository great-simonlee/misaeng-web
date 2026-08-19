export const ELLIEO_GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
] as const

export const ELLIEO_OCCUPATION_OPTIONS = [
  { value: 'student', label: '학생' },
  { value: 'professional', label: '직장인' },
  { value: 'other', label: '기타' },
] as const

export type EllieoGender = (typeof ELLIEO_GENDER_OPTIONS)[number]['value']
export type EllieoOccupationType =
  (typeof ELLIEO_OCCUPATION_OPTIONS)[number]['value']

const GENDER_TO_API: Record<EllieoGender, string> = {
  male: 'male',
  female: 'female',
  other: 'other',
}

const OCCUPATION_TO_API: Record<EllieoOccupationType, string> = {
  student: 'student',
  professional: 'professional',
  other: 'other',
}

const GENDER_FROM_API: Record<string, EllieoGender> = {
  male: 'male',
  female: 'female',
  other: 'other',
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
}

const OCCUPATION_FROM_API: Record<string, EllieoOccupationType> = {
  student: 'student',
  professional: 'professional',
  other: 'other',
  STUDENT: 'student',
  PROFESSIONAL: 'professional',
  OTHER: 'other',
}

export function toEllieoGenderApi(value: string): string {
  const normalized = value.trim().toLowerCase() as EllieoGender
  return GENDER_TO_API[normalized] ?? 'other'
}

export function toEllieoOccupationApi(value: string): string {
  const normalized = value.trim().toLowerCase() as EllieoOccupationType
  return OCCUPATION_TO_API[normalized] ?? 'other'
}

export function fromEllieoGenderApi(value: string | null | undefined): EllieoGender | null {
  if (!value?.trim()) return null
  return GENDER_FROM_API[value.trim()] ?? GENDER_FROM_API[value.trim().toUpperCase()] ?? null
}

export function fromEllieoOccupationApi(
  value: string | null | undefined,
): EllieoOccupationType | null {
  if (!value?.trim()) return null
  return (
    OCCUPATION_FROM_API[value.trim()] ??
    OCCUPATION_FROM_API[value.trim().toUpperCase()] ??
    null
  )
}
