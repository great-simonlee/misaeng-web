/**
 * 한 사람이 학교를 여러 개 인증할 수 있다 (최대 MAX_VERIFIED_SCHOOLS).
 * 프로필의 verifiedSchoolId/Name/schoolEmail은 "대표 학교"로 그대로 두어, 학교를 읽는 기존 코드
 * (글쓰기 스냅샷, 학교 게시판 게이트, 비자 필터)는 바뀌지 않는다.
 * 예전 프로필(학교 하나만 저장)은 verifiedSchools 없이 대표 학교 하나짜리 목록으로 읽는다 — 데이터 이전 없음.
 */

export const MAX_VERIFIED_SCHOOLS = 3

export type VerifiedSchoolEntry = {
  /** VERIFIED_SCHOOLS의 id. 목록에 없는 학교 도메인이면 null */
  id: string | null
  name: string
  /** 인증한 학교 메일 (항목의 키) */
  email: string
  verifiedAt: number | null
}

type SchoolFields = {
  schoolEmail?: string | null
  schoolEmailVerified?: boolean
  verifiedSchoolId?: string | null
  verifiedSchoolName?: string | null
  verifiedSchools?: VerifiedSchoolEntry[] | null
}

function normalizeEntry(raw: unknown): VerifiedSchoolEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!email || !name) return null
  return {
    id: typeof r.id === 'string' && r.id.trim() ? r.id.trim() : null,
    name,
    email,
    verifiedAt: typeof r.verifiedAt === 'number' && Number.isFinite(r.verifiedAt) ? r.verifiedAt : null,
  }
}

/** 인증한 학교 목록. 대표 학교가 맨 앞 */
export function listVerifiedSchools(profile: SchoolFields | null | undefined): VerifiedSchoolEntry[] {
  if (!profile) return []
  const stored = Array.isArray(profile.verifiedSchools)
    ? profile.verifiedSchools.map(normalizeEntry).filter((e): e is VerifiedSchoolEntry => Boolean(e))
    : []

  const primaryEmail = profile.schoolEmail?.trim().toLowerCase() || ''
  const legacy =
    profile.schoolEmailVerified && primaryEmail && profile.verifiedSchoolName?.trim()
      ? {
          id: profile.verifiedSchoolId?.trim() || null,
          name: profile.verifiedSchoolName.trim(),
          email: primaryEmail,
          verifiedAt: null,
        }
      : null

  const list = [...stored]
  if (legacy && !list.some((e) => e.email === legacy.email)) list.unshift(legacy)

  const seen = new Set<string>()
  const unique = list.filter((e) => (seen.has(e.email) ? false : (seen.add(e.email), true)))
  const primaryIndex = unique.findIndex((e) => e.email === primaryEmail)
  if (primaryIndex > 0) unique.unshift(...unique.splice(primaryIndex, 1))
  return unique.slice(0, MAX_VERIFIED_SCHOOLS)
}

/** 대표 학교로 정할 때 프로필에 저장할 필드 */
export function primarySchoolPatch(entry: VerifiedSchoolEntry) {
  return {
    schoolEmail: entry.email,
    schoolEmailVerified: true,
    verifiedSchoolId: entry.id,
    verifiedSchoolName: entry.name,
  }
}
