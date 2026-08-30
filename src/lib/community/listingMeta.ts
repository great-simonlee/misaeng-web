import { getVerifiedSchool } from '@lib/constants/schools'

/** 학교 배지와 겹치는 위치/기관 문구인지 */
export function isListingMetaSameAsSchool(
  value: string | null | undefined,
  authorSchoolId: string | null | undefined,
  authorSchoolName?: string | null,
): boolean {
  const text = value?.trim().toLowerCase()
  if (!text) return false

  const school = getVerifiedSchool(authorSchoolId)
  const candidates = [
    authorSchoolName,
    school?.shortName,
    school?.fullName,
  ]
    .map((item) => item?.trim().toLowerCase())
    .filter(Boolean) as string[]

  return candidates.some(
    (name) => text === name || text.includes(name) || name.includes(text),
  )
}

/** 목록 카드용 보조 태그 (학교명과 중복이면 숨김) */
export function getListingContextTag(
  parts: Array<string | null | undefined>,
  authorSchoolId: string | null | undefined,
  authorSchoolName?: string | null,
): string | null {
  const unique = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter(
      (part) =>
        !isListingMetaSameAsSchool(part, authorSchoolId, authorSchoolName),
    )

  if (unique.length === 0) return null
  return [...new Set(unique)].join(' · ')
}
