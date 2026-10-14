import type { CityId } from '@lib/constants/cities'
import type { DegreeLevel, JobFunction } from '@lib/constants/postingCopy'

/** 사용자에게 보이는 채용 공고 (승인된 인턴·신입 공고) */
export type PostingLevel = 'intern' | 'new_grad'
export type WorkArrangement = 'onsite' | 'hybrid' | 'remote' | 'unknown'

export type PublicPosting = {
  id: string
  company: { id: string; slug: string; name: string; logoUrl: string | null; industry: string }
  title: string
  level: PostingLevel
  /** null: 직무 분류 전 (job_posting_function.sql 실행 전) */
  jobFunction: JobFunction | null
  workArrangement: WorkArrangement
  regions: string[]
  summary: {
    overview: string[]
    qualifications: string[]
    workType: string
    location: string
    /** 지원 팁 (수시 심사, 지원 횟수 제한, 제출 서류 등) */
    applyNotes: string[]
    /** 빨리 지원할수록 유리 (수시 심사 등) */
    earlyApply: boolean
    /** 지원 대상: 학부생 / 대학원생 / 둘 다 / 공고에 없음 */
    degree: DegreeLevel
  }
  /** 공고에 "비자 스폰서십 불가" 문구가 있음 */
  noSponsorship: boolean
  /** 자동 태그: korean_preferred(한국어 우대), korea_based(한국 근무), intern, new_grad */
  tags: string[]
  /** 지원 마감일 "YYYY-MM-DD" (없으면 null). 마감이 지난 공고는 내려오지 않는다. */
  applyBy: string | null
  applyUrl: string
  postedAt: number
}

/** 도시 사이트별로 먼저 보여 줄 지역 (영문 "New York, NY"와 한국어 "뉴욕 (New York, NY)" 모두) */
const CITY_REGION_PATTERNS: Record<CityId, RegExp> = {
  nyc: /new york|\bnyc\b|manhattan|brooklyn|뉴욕/i,
  boston: /boston|cambridge, ma|보스턴/i,
}

/** 보고 있는 도시의 지역을 맨 앞으로 (나머지 순서는 그대로) */
export function cityFirst(regions: string[], city: CityId): string[] {
  const pattern = CITY_REGION_PATTERNS[city]
  if (!pattern) return regions
  return [...regions.filter((r) => pattern.test(r)), ...regions.filter((r) => !pattern.test(r))]
}

/** 요약의 지역 문장 "샬럿 (Charlotte, NC) · 뉴욕 (New York, NY)"도 같은 규칙으로 */
export function cityFirstText(text: string, city: CityId): string {
  const parts = text.split(/\s+·\s+/)
  return parts.length > 1 ? cityFirst(parts, city).join(' · ') : text
}

/** 미국 동부 기준 오늘 "YYYY-MM-DD" */
export function todayInNewYork(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/** 마감일까지 남은 날 (오늘 마감이면 0, 지났으면 음수) */
export function daysUntil(isoDate: string, today = todayInNewYork()) {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return Date.UTC(y, m - 1, day)
  }
  return Math.round((toUtc(isoDate) - toUtc(today)) / 86_400_000)
}

/** "공고 원문 보기" 클릭 1건 기록. 실패해도 링크 이동은 막지 않는다. */
export function trackPostingClick(postingId: string) {
  const url = `/api/postings/${encodeURIComponent(postingId)}/click`
  try {
    if (navigator.sendBeacon?.(url, new Blob(['{}'], { type: 'application/json' }))) return
  } catch {
    // fall through
  }
  void fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
}

/** 전체 공고, 또는 company(slug)가 있으면 그 회사 공고만 */
export async function fetchPostings(city: CityId, company?: string): Promise<PublicPosting[]> {
  return (await fetchPostingsWithMore(city, company)).postings
}

/** 회사 공고 + 그 회사의 공식 채용 검색 링크 ("더 많은 공고는 …", 관리자가 등록한 감시 검색) */
export async function fetchPostingsWithMore(
  city: CityId,
  company?: string,
): Promise<{ postings: PublicPosting[]; moreUrl: string | null }> {
  const params = new URLSearchParams({ city })
  if (company) params.set('company', company)
  const res = await fetch(`/api/postings?${params}`, { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as {
    postings?: PublicPosting[]
    moreUrl?: string | null
    error?: string
  }
  if (!res.ok) throw new Error(data.error || '공고를 불러오지 못했어요.')
  return { postings: data.postings ?? [], moreUrl: data.moreUrl ?? null }
}

/** 공고 목록 구분 필터: 레벨(인턴·신입)과 태그(한국어 우대·한국 근무) 중 하나 */
export type PostingKind = 'all' | 'intern' | 'new_grad' | 'korean_preferred' | 'korea_based'

export function matchesKind(posting: PublicPosting, kind: PostingKind) {
  if (kind === 'all') return true
  if (kind === 'intern' || kind === 'new_grad') return posting.level === kind
  return posting.tags.includes(kind)
}
