import type { CityId } from '@lib/constants/cities'
import type { VisaStatus } from '@lib/constants/company'
import type { JobReviewTypeId } from '@/types/nyc'

export type CompanyListItem = {
  slug: string
  name: string
  aliases: string[]
  industry: string
  industryLabel: string
  logoUrl: string | null
  careersUrl: string
  studentsUrl: string | null
  isFeatured: boolean
  country: string | null
  reviewCount: number
  /** 사이트에 보이는 인턴·신입 공고 수 */
  postingCount: number
}

export type CompanyVisaInfo = {
  h1bSponsor: VisaStatus | null
  eVerify: VisaStatus | null
  optCpt: VisaStatus | null
  /** 공개 비자 안내 (예: "비자 지원 언급 있음"), 안내문, 근거 링크, 확인일 */
  summary?: string | null
  notice?: string | null
  sourceUrl?: string | null
  checkedAt?: string | null
}

export type CompanySummary = {
  slug: string
  name: string
  industry: string
  industryLabel: string
  logoUrl: string | null
  reviewCount: number
}

export type CompanyDetail = {
  company: CompanySummary & {
    aliases: string[]
    careersUrl: string
    studentsUrl: string | null
    isFeatured: boolean
    websiteDomain: string | null
    country: string | null
    atsType: string
    visa: CompanyVisaInfo
  }
  parent: CompanySummary | null
  children: CompanySummary[]
}

export type CompanyReview = {
  meta: {
    id: string
    title: string
    jobReviewType: JobReviewTypeId | null
    typeLabel: string | null
    jobReviewIndustry: string | null
    companyId: string | null
    companyText: string | null
    city: CityId | null
    createdAt: number
    updatedAt: number
    viewCount: number
    commentCount: number
    recommendCount: number
    authorNickname: string | null
    authorSchoolName: string | null
  }
  body: Record<string, unknown> | null
  canViewBody: boolean
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    const error = new Error(data.error || '요청에 실패했어요.') as Error & { status?: number }
    error.status = res.status
    throw error
  }
  return data
}

/** 업계 코드와 한국어 이름 (관리자가 정한 순서) */
export type CompanyIndustryOption = { code: string; label: string }

export async function fetchCompanies(
  city: CityId,
): Promise<{ companies: CompanyListItem[]; industries: CompanyIndustryOption[] }> {
  const data = await getJson<{ companies: CompanyListItem[]; industries?: CompanyIndustryOption[] }>(
    `/api/companies?city=${encodeURIComponent(city)}`,
  )
  return { companies: data.companies ?? [], industries: data.industries ?? [] }
}

export function fetchCompany(slug: string, city: CityId): Promise<CompanyDetail> {
  return getJson<CompanyDetail>(
    `/api/companies/${encodeURIComponent(slug)}?city=${encodeURIComponent(city)}`,
  )
}

export async function fetchCompanyReviews(
  slug: string,
  city: CityId,
  options: { includeSubsidiaries?: boolean } = {},
): Promise<CompanyReview[]> {
  const params = new URLSearchParams({ city })
  if (options.includeSubsidiaries) params.set('includeSubsidiaries', '1')
  const data = await getJson<{ reviews: CompanyReview[] }>(
    `/api/companies/${encodeURIComponent(slug)}/reviews?${params}`,
  )
  return data.reviews ?? []
}

/** 링크 이동을 막지 않도록 응답을 기다리지 않는다. */
export function trackCompanyClick(slug: string, kind: 'careers' | 'students') {
  const url = `/api/companies/${encodeURIComponent(slug)}/click`
  const body = JSON.stringify({ kind })
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return
  } catch {
    // fall through
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
