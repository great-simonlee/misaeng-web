import type { CityId } from '@lib/constants/cities'
import {
  COMPANY_REVIEW_BOARD,
  toVisaStatus,
  type CompanyClickKind,
  type VisaStatus,
} from '@lib/constants/company'
import { listStoredOpenBoardPosts } from '@lib/supabase/community.server'

/*
 * 회사 데이터는 ellieo-erp 관리자 화면이 관리하고 Supabase Postgres에 있다
 * (ellieo-erp/supabase/companies.sql).
 *   public.companies        회사 (노출: is_active, 삭제: deleted_at)
 *   public.company_clicks   채용 링크 클릭 1건 = 1행
 * 서버에서 service role 키로 PostgREST를 호출한다. 이 파일은 읽기와 클릭 기록만 한다.
 */

const INDEX_TTL_MS = 60_000

// 사용자에게 필요한 컬럼만 읽는다 (internal_notes, verified_by 등 관리자 필드 제외).
const PUBLIC_COLUMNS = [
  'id',
  'slug',
  'name',
  'aliases',
  'parent_company_id',
  'industry',
  'logo_url',
  'careers_url',
  'students_url',
  'website_domain',
  'country',
  'ats_type',
  'h1b_sponsor',
  'e_verify',
  'opt_cpt',
  'is_featured',
].join(',')

type CompanyRow = {
  id: string
  slug: string
  name: string
  aliases: string[] | null
  parent_company_id: string | null
  industry: string
  logo_url: string | null
  careers_url: string
  students_url: string | null
  website_domain: string | null
  country: string | null
  ats_type: string | null
  h1b_sponsor: string | null
  e_verify: string | null
  opt_cpt: string | null
  is_featured: boolean
}

/** 사용자에게 내보내는 회사 정보 (관리자 메모·확인 기록 등 내부 필드 제외) */
export type PublicCompany = {
  id: string
  slug: string
  name: string
  aliases: string[]
  industry: string
  logoUrl: string | null
  careersUrl: string
  studentsUrl: string | null
  parentCompanyId: string | null
  isFeatured: boolean
  websiteDomain: string | null
  country: string | null
  atsType: string
  h1bSponsor: VisaStatus | null
  eVerify: VisaStatus | null
  optCpt: VisaStatus | null
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

export function isCompanyStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

function storageHeaders(contentType?: string) {
  const key = getSupabaseSecretKey() || ''
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` }
  if (contentType) headers['Content-Type'] = contentType
  return headers
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function toPublicCompany(row: CompanyRow): PublicCompany | null {
  if (!row?.id || !row.slug || !row.name || !isHttpsUrl(row.careers_url)) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    industry: row.industry || 'other',
    logoUrl: row.logo_url || null,
    careersUrl: row.careers_url,
    studentsUrl: isHttpsUrl(row.students_url) ? row.students_url : null,
    parentCompanyId: row.parent_company_id || null,
    isFeatured: row.is_featured === true,
    websiteDomain: row.website_domain || null,
    country: row.country || null,
    atsType: row.ats_type || 'unknown',
    h1bSponsor: toVisaStatus(row.h1b_sponsor),
    eVerify: toVisaStatus(row.e_verify),
    optCpt: toVisaStatus(row.opt_cpt),
  }
}

let indexCache: { at: number; value: PublicCompany[] } | null = null

/** 노출 중이고 삭제되지 않은 회사 (정렬 순서대로). 60초 캐시. */
export async function listActiveCompanies(): Promise<PublicCompany[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache.value
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return []
  // is_active = 관리자 화면의 "Show on Misaeng site". 추천 회사 먼저, 그다음 이름순.
  const query = `select=${PUBLIC_COLUMNS}&is_active=eq.true&deleted_at=is.null&order=is_featured.desc,name.asc`
  const res = await fetch(`${url}/rest/v1/companies?${query}`, {
    headers: storageHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)
  if (!res?.ok) {
    if (res) console.error('Companies DB error:', res.status, await res.text().catch(() => ''))
    // 일시적인 오류면 이전 캐시를 그대로 쓴다.
    return indexCache?.value ?? []
  }
  const rows = ((await res.json().catch(() => null)) as CompanyRow[] | null) ?? []
  const companies = rows.map(toPublicCompany).filter((c): c is PublicCompany => Boolean(c))
  indexCache = { at: Date.now(), value: companies }
  return companies
}

export async function getActiveCompanyById(id: string): Promise<PublicCompany | null> {
  if (!id) return null
  return (await listActiveCompanies()).find((c) => c.id === id) ?? null
}

export async function getActiveCompanyBySlug(slug: string): Promise<PublicCompany | null> {
  const key = String(slug || '').trim().toLowerCase()
  if (!key) return null
  return (await listActiveCompanies()).find((c) => c.slug === key) ?? null
}

/** 회사별 공개 면접/취업 후기 */
export async function listCompanyReviewPosts(city?: CityId) {
  return listStoredOpenBoardPosts(COMPANY_REVIEW_BOARD, city)
}

export async function countReviewsByCompany(city?: CityId): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const post of await listCompanyReviewPosts(city)) {
    if (post.companyId) counts[post.companyId] = (counts[post.companyId] || 0) + 1
  }
  return counts
}

/** 채용 링크 클릭 1건 기록 (company_clicks). 관리자 화면이 최근 30일 클릭 수를 센다. */
export async function recordCompanyClick(input: {
  companyId: string
  kind: CompanyClickKind
  userId: string | null
}): Promise<boolean> {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return false
  const res = await fetch(`${url}/rest/v1/company_clicks`, {
    method: 'POST',
    headers: { ...storageHeaders('application/json'), Prefer: 'return=minimal' },
    body: JSON.stringify({ company_id: input.companyId, kind: input.kind, user_id: input.userId }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  return Boolean(res?.ok)
}

/**
 * 후기 작성·수정 API의 companyId 입력 확인.
 * - undefined: 값을 보내지 않음 (수정이면 기존 값 유지)
 * - null / '': 회사 연결 없음 ("목록에 없는 회사")
 * - 문자열: 노출 중인 회사여야 함
 */
export async function resolveReviewCompanyId(
  value: unknown,
): Promise<{ ok: true; companyId: string | null | undefined } | { ok: false; error: string }> {
  if (value === undefined) return { ok: true, companyId: undefined }
  if (value === null || value === '') return { ok: true, companyId: null }
  if (typeof value !== 'string') return { ok: false, error: '회사를 다시 선택해 주세요.' }
  const company = await getActiveCompanyById(value.trim())
  if (!company) return { ok: false, error: '회사를 다시 선택해 주세요.' }
  return { ok: true, companyId: company.id }
}
