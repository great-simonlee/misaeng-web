/** 16가지 MBTI 유형 */
export const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const

export type MbtiType = (typeof MBTI_TYPES)[number]

export function isMbtiType(value: string): value is MbtiType {
  return (MBTI_TYPES as readonly string[]).includes(value.toUpperCase())
}

export function normalizeMbti(value: string): MbtiType | null {
  const upper = value.trim().toUpperCase()
  return isMbtiType(upper) ? upper : null
}
