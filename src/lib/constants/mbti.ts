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
    label: '분석형',
    subtitle: '직관 · 사고',
    types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  },
  {
    id: 'diplomat',
    label: '외교관형',
    subtitle: '직관 · 감정',
    types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  },
  {
    id: 'sentinel',
    label: '관리자형',
    subtitle: '감각 · 사고',
    types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  },
  {
    id: 'explorer',
    label: '탐험가형',
    subtitle: '감각 · 감정',
    types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
  },
] as const

/** 16유형별 한국어 별칭 (16Personalities 기준) */
export const MBTI_NICKNAMES: Record<MbtiType, string> = {
  INTJ: '용의주도한 전략가',
  INTP: '논리적인 사색가',
  ENTJ: '대담한 통솔자',
  ENTP: '뜨거운 논쟁을 즐기는 변론가',
  INFJ: '선의의 옹호자',
  INFP: '열정적인 중재자',
  ENFJ: '정의로운 사회운동가',
  ENFP: '재기발랄한 활동가',
  ISTJ: '청렴결백한 논리주의자',
  ISFJ: '용감한 수호자',
  ESTJ: '엄격한 관리자',
  ESFJ: '사교적인 외교관',
  ISTP: '만능 재주꾼',
  ISFP: '호기심 많은 예술가',
  ESTP: '모험을 즐기는 사업가',
  ESFP: '자유로운 영혼의 연예인',
}

export function getMbtiNickname(type: string): string | null {
  const normalized = normalizeMbti(type)
  return normalized ? MBTI_NICKNAMES[normalized] : null
}

export function getMbtiGroupLabel(type: string) {
  const normalized = type.trim().toUpperCase()
  return (
    MBTI_GROUPS.find((group) =>
      (group.types as readonly string[]).includes(normalized),
    )?.label ?? null
  )
}

export const MBTI_DIMENSIONS = [
  {
    id: 'ei',
    label: '에너지',
    options: [
      { value: 'E', label: '외향', hint: 'E' },
      { value: 'I', label: '내향', hint: 'I' },
    ],
  },
  {
    id: 'ns',
    label: '인식',
    options: [
      { value: 'N', label: '직관', hint: 'N' },
      { value: 'S', label: '감각', hint: 'S' },
    ],
  },
  {
    id: 'tf',
    label: '판단',
    options: [
      { value: 'T', label: '사고', hint: 'T' },
      { value: 'F', label: '감정', hint: 'F' },
    ],
  },
  {
    id: 'jp',
    label: '생활',
    options: [
      { value: 'J', label: '계획', hint: 'J' },
      { value: 'P', label: '즉흥', hint: 'P' },
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
