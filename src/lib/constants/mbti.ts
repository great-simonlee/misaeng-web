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

export const MBTI_GROUPS = [
  {
    id: 'analyst',
    types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  },
  {
    id: 'diplomat',
    types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  },
  {
    id: 'sentinel',
    types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  },
  {
    id: 'explorer',
    types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
  },
] as const

export type MbtiGroupId = (typeof MBTI_GROUPS)[number]['id']

/** 16유형 별칭(16Personalities 기준)·그룹 이름은 common.ui.mbti.nicknames.<TYPE> / groups.<id> */
export function getMbtiGroupId(type: string): MbtiGroupId | null {
  const normalized = type.trim().toUpperCase()
  return (
    MBTI_GROUPS.find((group) =>
      (group.types as readonly string[]).includes(normalized),
    )?.id ?? null
  )
}

/** 화면 문구: common.ui.mbti.dimensions.<id> / options.<value> */
export const MBTI_DIMENSIONS = [
  {
    id: 'ei',
    options: [
      { value: 'E', hint: 'E' },
      { value: 'I', hint: 'I' },
    ],
  },
  {
    id: 'ns',
    options: [
      { value: 'N', hint: 'N' },
      { value: 'S', hint: 'S' },
    ],
  },
  {
    id: 'tf',
    options: [
      { value: 'T', hint: 'T' },
      { value: 'F', hint: 'F' },
    ],
  },
  {
    id: 'jp',
    options: [
      { value: 'J', hint: 'J' },
      { value: 'P', hint: 'P' },
    ],
  },
] as const

export type MbtiDimensionValue =
  (typeof MBTI_DIMENSIONS)[number]['options'][number]['value']

export function parseMbtiDimensions(type: string): (MbtiDimensionValue | null)[] {
  const normalized = type.trim().toUpperCase()
  if (normalized.length !== 4) {
    return [null, null, null, null]
  }

  const chars = normalized.split('') as MbtiDimensionValue[]
  const validSets = MBTI_DIMENSIONS.map(
    (dimension) => new Set(dimension.options.map((option) => option.value)),
  )

  return chars.map((char, index) =>
    validSets[index]?.has(char) ? char : null,
  ) as (MbtiDimensionValue | null)[]
}

export function composeMbtiFromDimensions(
  dimensions: readonly (MbtiDimensionValue | null)[],
): MbtiType | null {
  if (dimensions.some((dimension) => !dimension)) return null
  const composed = dimensions.join('')
  return isMbtiType(composed) ? composed : null
}

export function isMbtiType(value: string): value is MbtiType {
  return (MBTI_TYPES as readonly string[]).includes(value.toUpperCase())
}

export function normalizeMbti(value: string): MbtiType | null {
  const upper = value.trim().toUpperCase()
  return isMbtiType(upper) ? upper : null
}
