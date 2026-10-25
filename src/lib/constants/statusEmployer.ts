/**
 * Status(CPT/OPT/비자 등) 글의 학교·회사·기관 선택 옵션
 *
 * 글에는 한국어 라벨("한국계 IT·소프트웨어 회사")이 location 문자열로 저장된다.
 * 기존 글과 맞추려고 저장 형식(prefix·label)은 그대로 두고,
 * 화면에는 translateStatusEmployerOption / translateStatusEmployerLocation으로 번역해 보여 준다.
 */

import type { Translate } from '@lib/i18n/translate'

export const STATUS_EMPLOYER_NAME_MAX = 20

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
  /** 저장용 라벨 접두어: "한국계", "미국", "외국계" (표시는 `me.statusEmployer.origins.<id>`) */
  prefix: string
}[] = [
  { id: 'korean', prefix: '한국계' },
  { id: 'us', prefix: '미국' },
  { id: 'foreign', prefix: '외국계' },
]

/** 유학생이 많이 가는 산업 (label은 저장용. 표시는 `me.statusEmployer.industries.<id>`) */
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

/** 드롭다운용 옵션 (국적 × 산업 + 그 외). label은 저장 값이다. 표시할 때는 translateStatusEmployerOption */
export const STATUS_EMPLOYER_OPTIONS: StatusEmployerOption[] = [
  ...STATUS_EMPLOYER_ORIGINS.flatMap((origin) =>
    STATUS_EMPLOYER_INDUSTRIES.map((industry) => ({
      value: `${origin.id}:${industry.id}`,
      label: buildEmployerLabel(origin.prefix, industry.label),
    })),
  ),
  { value: STATUS_EMPLOYER_OTHER_VALUE, label: '그 외' },
]

/**
 * 셀렉트 옵션 값(`korean:tech`, `other`)을 현재 언어 라벨로 바꾼다.
 * t는 네임스페이스 없는 번역기(`useT()`)다. 키: `me.statusEmployer.*`
 */
export function translateStatusEmployerOption(t: Translate, value: string): string {
  if (isStatusEmployerOther(value)) return t('me.statusEmployer.other')
  const [originId, industryId] = value.split(':')
  const origin = STATUS_EMPLOYER_ORIGINS.find((item) => item.id === originId)
  const industry = STATUS_EMPLOYER_INDUSTRIES.find((item) => item.id === industryId)
  if (!origin || !industry) return getStatusEmployerLabel(value) ?? value
  return t('me.statusEmployer.option', {
    origin: t(`me.statusEmployer.origins.${origin.id}`),
    industry: t(`me.statusEmployer.industries.${industry.id}`),
  })
}

/** 저장된 location이 카테고리 라벨이면 번역하고, 직접 입력한 회사명이면 그대로 돌려준다. */
export function translateStatusEmployerLocation(t: Translate, location: string): string {
  const parsed = parseStatusEmployerLocation(location)
  if (parsed.optionValue && !isStatusEmployerOther(parsed.optionValue)) {
    return translateStatusEmployerOption(t, parsed.optionValue)
  }
  return location
}

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

export type EmployerFilterMode = 'all' | 'name' | 'category'

export type EmployerFilter = {
  mode: EmployerFilterMode
  name: string
  category: string
}

export const EMPTY_EMPLOYER_FILTER: EmployerFilter = {
  mode: 'all',
  name: '',
  category: '',
}

export function isEmployerFilterActive(filter: EmployerFilter) {
  if (filter.mode === 'name') return Boolean(filter.name.trim())
  if (filter.mode === 'category') return Boolean(filter.category)
  return false
}

/** 회사명 부분 일치 또는 카테고리 정확 일치 */
export function matchesEmployerFilter(
  location: string | null | undefined,
  filter: EmployerFilter,
) {
  if (!isEmployerFilterActive(filter)) return true
  const parsed = parseStatusEmployerLocation(String(location || ''))
  if (filter.mode === 'name') {
    const query = filter.name.trim().toLowerCase()
    if (!parsed.otherText) return false
    return parsed.otherText.toLowerCase().includes(query)
  }
  return parsed.optionValue === filter.category
}
