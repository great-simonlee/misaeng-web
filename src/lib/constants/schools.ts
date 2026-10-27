/**
 * 학교 id. 기본 목록 외에 ERP(Misaeng → Schools)에서 학교를 더할 수 있어 문자열이다.
 * 기본 목록의 id는 BuiltinSchoolId.
 */
export type VerifiedSchoolId = string

export type BuiltinSchoolId =
  | 'nyu'
  | 'columbia'
  | 'fit'
  | 'parsons'
  | 'sva'
  | 'baruch'
  | 'stonybrook'
  | 'buffalo'
  | 'binghamton'
  | 'pace'
  | 'fordham'
  | 'monroe'

export type VerifiedSchool = {
  id: VerifiedSchoolId
  /** 화면에 보이는 짧은 마크 (예: NYU) */
  shortName: string
  /** 정식 명칭 */
  fullName: string
  /** 매칭할 이메일 도메인 (소문자). 서브도메인 포함 매칭 */
  domains: string[]
  /** false면 새 인증은 받지 않지만, 이미 인증한 사람의 배지·이름은 그대로 보인다 (기본 true) */
  enabled?: boolean
}

/**
 * 기본 학교 목록 (ERP 학교 목록이 아직 저장되지 않았거나 불러오지 못했을 때 쓰는 값, ERP의 "Seed" 원본).
 * Ellieo 백엔드의 학교 인증 엔드포인트도 이 도메인들을 안다.
 */
export const BUILTIN_VERIFIED_SCHOOLS: VerifiedSchool[] = [
  {
    id: 'nyu',
    shortName: 'NYU',
    fullName: 'New York University',
    domains: ['nyu.edu', 'stern.nyu.edu', 'cims.nyu.edu', 'misaeng.com'],
  },
  {
    id: 'columbia',
    shortName: 'Columbia',
    fullName: 'Columbia University',
    domains: [
      'columbia.edu',
      'barnard.edu',
      'tc.columbia.edu',
      'gsb.columbia.edu',
    ],
  },
  {
    id: 'fit',
    shortName: 'FIT',
    fullName: 'Fashion Institute of Technology',
    domains: ['fitnyc.edu'],
  },
  {
    id: 'parsons',
    shortName: 'Parsons',
    fullName: 'Parsons / The New School',
    domains: ['newschool.edu'],
  },
  {
    id: 'sva',
    shortName: 'SVA',
    fullName: 'School of Visual Arts',
    domains: ['sva.edu'],
  },
  {
    id: 'baruch',
    shortName: 'Baruch',
    fullName: 'Baruch College',
    domains: ['baruchmail.cuny.edu', 'baruch.cuny.edu'],
  },
  {
    id: 'stonybrook',
    shortName: 'Stonybrook',
    fullName: 'Stony Brook University',
    domains: ['stonybrook.edu'],
  },
  {
    id: 'buffalo',
    shortName: 'Buffalo',
    fullName: 'University at Buffalo',
    domains: ['buffalo.edu'],
  },
  {
    id: 'binghamton',
    shortName: 'Binghamton',
    fullName: 'Binghamton University',
    domains: ['binghamton.edu'],
  },
  {
    id: 'pace',
    shortName: 'Pace',
    fullName: 'Pace University',
    domains: ['pace.edu'],
  },
  {
    id: 'fordham',
    shortName: 'Fordham',
    fullName: 'Fordham University',
    domains: ['fordham.edu'],
  },
  {
    id: 'monroe',
    shortName: 'Monroe',
    fullName: 'Monroe University',
    domains: ['monroeu.com'],
  },
]

/** @deprecated 기본 목록만 담는다. ERP에서 더한 학교까지 보려면 getVerifiedSchools()/useVerifiedSchools() */
export const VERIFIED_SCHOOLS = BUILTIN_VERIFIED_SCHOOLS

/*
 * 지금 쓰는 학교 목록. 처음엔 기본 목록이고, 서버는 schoolRegistry.server.ts가, 브라우저는
 * useVerifiedSchools()가 ERP 목록(/api/schools)을 불러오면 바꿔 넣는다 — 그래서 아래 동기 함수들이
 * 그대로 ERP에서 더한 학교도 찾는다.
 */
let activeSchools: VerifiedSchool[] = BUILTIN_VERIFIED_SCHOOLS
const listeners = new Set<() => void>()

/** 사용 중지된 학교까지 포함 (예전 배지·이름 표시용) */
export function getVerifiedSchools(): VerifiedSchool[] {
  return activeSchools
}

/** 지금 인증받는 학교 (필터·도메인 매칭) */
export function getEnabledSchools(): VerifiedSchool[] {
  return activeSchools.filter((school) => school.enabled !== false)
}

export function setVerifiedSchools(list: VerifiedSchool[]) {
  const next = list.length > 0 ? list : BUILTIN_VERIFIED_SCHOOLS
  if (JSON.stringify(next) === JSON.stringify(activeSchools)) return
  activeSchools = next
  for (const listener of listeners) listener()
}

export function subscribeVerifiedSchools(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getVerifiedSchool(
  id: string | null | undefined,
): VerifiedSchool | null {
  if (!id) return null
  return (
    activeSchools.find((s) => s.id === id) ??
    BUILTIN_VERIFIED_SCHOOLS.find((s) => s.id === id) ??
    null
  )
}

/** 등록된 학교 이메일 도메인 목록 */
export function getRegisteredSchoolDomains(): string[] {
  return getEnabledSchools().flatMap((school) => school.domains)
}

function domainMatches(emailDomain: string, schoolDomain: string): boolean {
  return (
    emailDomain === schoolDomain || emailDomain.endsWith(`.${schoolDomain}`)
  )
}

/** 이메일 도메인으로 목록에서 학교를 찾는다 (긴 도메인 우선) */
export function findSchoolByEmail(
  email: string,
  schools: VerifiedSchool[],
): VerifiedSchool | null {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return null

  // 긴 도메인 우선 (예: tc.columbia.edu → columbia, baruchmail.cuny.edu → baruch)
  const ranked = schools
    .flatMap((school) =>
      school.domains.map((d) => ({ school, domain: d, len: d.length })),
    )
    .sort((a, b) => b.len - a.len)

  for (const entry of ranked) {
    if (domainMatches(domain, entry.domain)) return entry.school
  }

  return null
}

/** 학교 이메일 도메인으로 인증 학교를 찾습니다 (사용 중인 학교만). */
export function resolveSchoolFromEmail(
  email: string,
): VerifiedSchool | null {
  return findSchoolByEmail(email, getEnabledSchools())
}
