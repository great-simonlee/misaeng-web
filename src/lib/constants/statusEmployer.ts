/** Status(CPT/OPT/비자 등) 글의 학교·회사·기관 선택 옵션 */

export const STATUS_EMPLOYER_OTHER_VALUE = 'other' as const

export type StatusEmployerOriginId = 'korean' | 'us' | 'foreign'

export type StatusEmployerIndustryId =
  | 'tech'
  | 'finance'
  | 'consulting'
  | 'healthcare'
  | 'accounting'
  | 'engineering'
  | 'marketing'

export const STATUS_EMPLOYER_ORIGINS: {
  id: StatusEmployerOriginId
  /** 라벨 접두어: "한국계", "미국", "외국계" */
  prefix: string
}[] = [
  { id: 'korean', prefix: '한국계' },
  { id: 'us', prefix: '미국' },
  { id: 'foreign', prefix: '외국계' },
]

/** 유학생이 많이 가는 산업 */
export const STATUS_EMPLOYER_INDUSTRIES: {
  id: StatusEmployerIndustryId
  label: string
}[] = [
  { id: 'tech', label: 'IT·소프트웨어' },
  { id: 'finance', label: '금융·핀테크' },
  { id: 'consulting', label: '컨설팅' },
  { id: 'healthcare', label: '헬스케어·바이오' },
  { id: 'accounting', label: '회계·세무' },
  { id: 'engineering', label: '제조·엔지니어링' },
  { id: 'marketing', label: '마케팅' },
]

export type StatusEmployerOption = {
  value: string
  label: string
}

function buildEmployerLabel(
  originPrefix: string,
  industryLabel: string,
): string {
  return `${originPrefix} ${industryLabel} 회사`
}

/** 드롭다운용 옵션 (국적 × 산업 + 그 외) */
export const STATUS_EMPLOYER_OPTIONS: StatusEmployerOption[] = [
  ...STATUS_EMPLOYER_ORIGINS.flatMap((origin) =>
    STATUS_EMPLOYER_INDUSTRIES.map((industry) => ({
      value: `${origin.id}:${industry.id}`,
      label: buildEmployerLabel(origin.prefix, industry.label),
    })),
  ),
  { value: STATUS_EMPLOYER_OTHER_VALUE, label: '그 외' },
]

export function isStatusEmployerOther(value: string): boolean {
  return value === STATUS_EMPLOYER_OTHER_VALUE
}

export function getStatusEmployerLabel(value: string): string | undefined {
  return STATUS_EMPLOYER_OPTIONS.find((option) => option.value === value)?.label
}

/** 저장된 location 문자열을 셀렉트 값 + 그 외 텍스트로 복원 */
export function parseStatusEmployerLocation(location: string): {
  optionValue: string
  otherText: string
} {
  const trimmed = location.trim()
  if (!trimmed) {
    return { optionValue: '', otherText: '' }
  }

  const matched = STATUS_EMPLOYER_OPTIONS.find(
    (option) =>
      option.value !== STATUS_EMPLOYER_OTHER_VALUE &&
      option.label === trimmed,
  )
  if (matched) {
    return { optionValue: matched.value, otherText: '' }
  }

  return {
    optionValue: STATUS_EMPLOYER_OTHER_VALUE,
    otherText: trimmed,
  }
}

/** 셀렉트 + 그 외 입력을 저장용 location 문자열로 합침 */
export function formatStatusEmployerLocation(
  optionValue: string,
  otherText: string,
): string {
  if (!optionValue) return ''
  if (isStatusEmployerOther(optionValue)) {
    return otherText.trim()
  }
  return getStatusEmployerLabel(optionValue) ?? ''
}
