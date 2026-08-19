export type VerifiedSchoolId =
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
  | 'misaeng'

export type VerifiedSchool = {
  id: VerifiedSchoolId
  /** 화면에 보이는 짧은 마크 (예: NYU) */
  shortName: string
  /** 정식 명칭 */
  fullName: string
  /** 매칭할 이메일 도메인 (소문자). 서브도메인 포함 매칭 */
  domains: string[]
}

/** 도메인 → 학교 소속 매핑. 인증 완료 시 배지 표시에 사용합니다. */
export const VERIFIED_SCHOOLS: VerifiedSchool[] = [
  {
    id: 'nyu',
    shortName: 'NYU',
    fullName: 'New York University',
    domains: ['nyu.edu', 'stern.nyu.edu', 'cims.nyu.edu'],
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
    id: 'misaeng',
    shortName: 'Misaeng',
    fullName: 'Misaeng (Test)',
    domains: ['misaeng.com'],
  },
]

export function getVerifiedSchool(
  id: string | null | undefined,
): VerifiedSchool | null {
  if (!id) return null
  return VERIFIED_SCHOOLS.find((s) => s.id === id) ?? null
}

function domainMatches(emailDomain: string, schoolDomain: string): boolean {
  return (
    emailDomain === schoolDomain || emailDomain.endsWith(`.${schoolDomain}`)
  )
}

/** 학교 이메일 도메인으로 인증 학교를 찾습니다. */
export function resolveSchoolFromEmail(
  email: string,
): VerifiedSchool | null {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return null

  // 긴 도메인 우선 (예: tc.columbia.edu → columbia, baruchmail.cuny.edu → baruch)
  const ranked = VERIFIED_SCHOOLS.flatMap((school) =>
    school.domains.map((d) => ({ school, domain: d, len: d.length })),
  ).sort((a, b) => b.len - a.len)

  for (const entry of ranked) {
    if (domainMatches(domain, entry.domain)) return entry.school
  }

  return null
}
