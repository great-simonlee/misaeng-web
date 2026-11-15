import type { CityId } from '@lib/constants/cities'
import {
  COMPANY_INDUSTRIES,
  COMPANY_REVIEW_BOARD,
  industryLabel,
  toVisaStatus,
  type CompanyClickKind,
  type VisaStatus,
} from '@lib/constants/company'
import { listStoredOpenBoardPosts } from '@lib/supabase/community.server'
import { companyKeys, normalizeCompanyKey } from '@lib/company/companyRules'

/*
 * 회사 데이터는 ellieo-erp 관리자 화면이 관리하고 Supabase Postgres에 있다
 * (ellieo-erp/supabase/companies.sql).
 *   public.companies        회사 (노출: is_active, 삭제: deleted_at)
 *   public.company_clicks   채용 링크 클릭 1건 = 1행
 *   public.company_industries  업계 목록 (관리자 화면에서 추가·수정·순서 변경)
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
  // 공개 비자 안내 (ellieo-erp/supabase/google_careers.sql 로 추가)
  'visa_policy_summary',
  'visa_policy_notice',
  'visa_policy_source_url',
  'visa_policy_checked_at',
].join(',')

/** 나중에 추가된 컬럼: 아직 없으면 오류 메시지를 보고 하나씩 빼고 다시 읽는다. */
const OPTIONAL_COLUMNS = ['visa_policy_summary', 'visa_policy_notice', 'visa_policy_source_url', 'visa_policy_checked_at']

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
  visa_policy_summary?: string | null
  visa_policy_notice?: string | null
  visa_policy_source_url?: string | null
  visa_policy_checked_at?: string | null
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
  /** 공개 비자 안내 (예: "비자 지원 언급 있음") + 안내문 + 근거 링크·확인일 */
  visaSummary: string | null
  visaNotice: string | null
  visaSourceUrl: string | null
  visaCheckedAt: string | null
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
    visaSummary: row.visa_policy_summary?.trim() || null,
    visaNotice: row.visa_policy_notice?.trim() || null,
    visaSourceUrl: isHttpsUrl(row.visa_policy_source_url) ? row.visa_policy_source_url : null,
    visaCheckedAt: row.visa_policy_checked_at || null,
  }
}

let indexCache: { at: number; value: PublicCompany[] } | null = null

/** 업계 코드와 한국어 이름 (관리자 화면의 순서대로) */
export type CompanyIndustryItem = { code: string; label: string }

const DEFAULT_INDUSTRIES: CompanyIndustryItem[] = COMPANY_INDUSTRIES.map((code) => ({
  code,
  label: industryLabel(code),
}))

let industriesCache: { at: number; value: CompanyIndustryItem[] } | null = null

/**
 * 업계 목록. 60초 캐시.
 * company_industries 표가 아직 없거나 읽기에 실패하면 코드에 있는 기본 목록을 쓴다.
 */
export async function listIndustries(): Promise<CompanyIndustryItem[]> {
  if (industriesCache && Date.now() - industriesCache.at < INDEX_TTL_MS) return industriesCache.value
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return DEFAULT_INDUSTRIES
  const res = await fetch(
    `${url}/rest/v1/company_industries?select=code,label_ko&order=sort_order.asc,label_ko.asc`,
    { headers: storageHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) },
  ).catch(() => null)
  if (!res?.ok) return industriesCache?.value ?? DEFAULT_INDUSTRIES
  const rows = ((await res.json().catch(() => null)) as { code: string; label_ko: string }[] | null) ?? []
  const value = rows.filter((r) => r?.code).map((r) => ({ code: r.code, label: r.label_ko || r.code }))
  industriesCache = { at: Date.now(), value: value.length ? value : DEFAULT_INDUSTRIES }
  return industriesCache.value
}

/** 코드 → 한국어 이름. 목록에 없는 코드는 기본 라벨(없으면 코드)로. */
export function industryLabelFrom(industries: CompanyIndustryItem[], code: string): string {
  return industries.find((i) => i.code === code)?.label ?? industryLabel(code)
}

/** 노출 중이고 삭제되지 않은 회사 (정렬 순서대로). 60초 캐시. */
export async function listActiveCompanies(): Promise<PublicCompany[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache.value
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return []
  // is_active = 관리자 화면의 "Show on Misaeng site". 추천 회사 먼저, 그다음 이름순.
  const filters = '&is_active=eq.true&deleted_at=is.null&order=is_featured.desc,name.asc'
  const request = (columns: string[]) =>
    fetch(`${url}/rest/v1/companies?select=${columns.join(',')}${filters}`, {
      headers: storageHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)
  let columns = PUBLIC_COLUMNS.split(',')
  let res = await request(columns)
  for (let i = 0; i < OPTIONAL_COLUMNS.length && res?.status === 400; i += 1) {
    const message = await res.clone().text().catch(() => '')
    const missing = OPTIONAL_COLUMNS.find((c) => columns.includes(c) && message.includes(c))
    if (!missing) break
    columns = columns.filter((c) => c !== missing)
    res = await request(columns)
  }
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
): Promise<{ ok: true; companyId: string | null | undefined } | { ok: false; errorKey: string }> {
  if (value === undefined) return { ok: true, companyId: undefined }
  if (value === null || value === '') return { ok: true, companyId: null }
  if (typeof value !== 'string') return { ok: false, errorKey: 'community.companyReselect' }
  const company = await getActiveCompanyById(value.trim())
  if (company) return { ok: true, companyId: company.id }
  // 회원이 등록한 검토 대기 회사 (findOrProposeCompany): 노출 전이어도 후기를 이어 둔다
  const proposed = await getProposedCompanyById(value.trim())
  if (proposed) return { ok: true, companyId: proposed.id }
  return { ok: false, errorKey: 'community.companyReselect' }
}

/*
 * 회원이 후기 작성 화면에서 등록한 회사 (목록에 없는 회사).
 * 공개 회사로 바로 만들지 않는다: is_active = false (Misaeng에 안 보임) 인 "검토 대기" 행으로 만들고
 * internal_notes 맨 앞에 MEMBER_PROPOSED_TAG 를 붙인다. ERP 회사 화면에서 이름·채용 링크·업계·로고를 확인하고
 * "Show on Misaeng site" 를 켜면 그때부터 회사 목록에 나오고, 그 사이에 쓴 후기도 companyId 로 바로 이어진다.
 * 관리자가 숨긴 회사(태그 없음)에는 후기를 이을 수 없다.
 */
export const MEMBER_PROPOSED_TAG = '[member-proposed]'
const PROPOSALS_PER_DAY = 5
export const PROPOSED_NAME_MAX = 80

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ProposedRow = { id: string; slug: string; name: string; aliases: string[] | null; industry: string; internal_notes: string | null }

/** 회원이 등록한 검토 대기 회사 (노출 전, 삭제 안 됨) */
async function listProposedCompanies(extraFilters = ''): Promise<ProposedRow[]> {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return []
  const tag = encodeURIComponent(`${MEMBER_PROPOSED_TAG}*`)
  const res = await fetch(
    `${url}/rest/v1/companies?select=id,slug,name,aliases,industry,internal_notes&is_active=eq.false&deleted_at=is.null&internal_notes=like.${tag}${extraFilters}&limit=1000`,
    { headers: storageHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) },
  ).catch(() => null)
  if (!res?.ok) return []
  return ((await res.json().catch(() => null)) as ProposedRow[] | null) ?? []
}

async function getProposedCompanyById(id: string): Promise<ProposedRow | null> {
  if (!UUID_RE.test(id)) return null
  return (await listProposedCompanies(`&id=eq.${id}`))[0] ?? null
}

/** 회사 이름 입력 정리: 공백 한 칸, 제어 문자 제거. 비었거나 너무 길거나 링크면 null. */
export function cleanProposedCompanyName(value: unknown): string | null {
  const name = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name || name.length > PROPOSED_NAME_MAX) return null
  if (/https?:\/\/|www\.|[<>{}]/i.test(name)) return null
  return name
}

function proposedSlug(name: string): string {
  const base = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, '') || 'new'
  return `${base || 'company'}-${suffix}`
}

export type ProposedCompanyResult =
  | { ok: true; company: { id: string; slug: string; name: string; industry: string; pending: boolean } | null; created: boolean }
  | { ok: false; reason: 'invalid' | 'tooMany' | 'failed' }

/**
 * 이름으로 회사 찾기, 없으면 검토 대기 회사로 등록.
 * - 노출 중인 회사 이름·별칭과 같으면 그 회사 (pending: false)
 * - 다른 회원이 이미 등록한 검토 대기 회사와 같으면 그 회사 (pending: true)
 * - 관리자가 숨긴 회사와 이름이 같으면 company: null (후기는 이름만 남는다)
 * - 아니면 새로 등록 (회원당 하루 5개까지)
 */
export async function findOrProposeCompany(input: { name: unknown; industry?: unknown; uid: string }): Promise<ProposedCompanyResult> {
  const name = cleanProposedCompanyName(input.name)
  if (!name) return { ok: false, reason: 'invalid' }
  const key = normalizeCompanyKey(name)
  if (!key) return { ok: false, reason: 'invalid' }

  const active = (await listActiveCompanies()).find((c) => companyKeys(c).includes(key))
  if (active) {
    return { ok: true, created: false, company: { id: active.id, slug: active.slug, name: active.name, industry: active.industry, pending: false } }
  }
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return { ok: false, reason: 'failed' }

  // 숨겨진 회사까지 이름으로 확인 (같은 회사를 두 번 만들지 않는다)
  const hiddenRes = await fetch(
    `${url}/rest/v1/companies?select=id,slug,name,aliases,industry,internal_notes&is_active=eq.false&deleted_at=is.null&limit=5000`,
    { headers: storageHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15000) },
  ).catch(() => null)
  if (!hiddenRes?.ok) return { ok: false, reason: 'failed' }
  const hidden = ((await hiddenRes.json().catch(() => null)) as ProposedRow[] | null) ?? []
  const same = hidden.find((c) => companyKeys({ name: c.name, aliases: c.aliases ?? [] }).includes(key))
  if (same) {
    const proposed = (same.internal_notes ?? '').startsWith(MEMBER_PROPOSED_TAG)
    return {
      ok: true,
      created: false,
      company: proposed ? { id: same.id, slug: same.slug, name: same.name, industry: same.industry, pending: true } : null,
    }
  }

  // 회원당 하루 등록 수 제한 (internal_notes 에 uid 를 남긴다)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const uidTag = encodeURIComponent(`*uid=${input.uid.replace(/[^A-Za-z0-9_-]/g, '')}*`)
  const mine = await listProposedCompanies(`&created_at=gte.${encodeURIComponent(since)}&internal_notes=like.${uidTag}`)
  if (mine.length >= PROPOSALS_PER_DAY) return { ok: false, reason: 'tooMany' }

  const industries = await listIndustries()
  const industry =
    typeof input.industry === 'string' && industries.some((i) => i.code === input.industry) ? input.industry : 'other'
  const notes =
    `${MEMBER_PROPOSED_TAG} uid=${input.uid.replace(/[^A-Za-z0-9_-]/g, '')} ${new Date().toISOString()} — ` +
    'Added by a member from the Misaeng review composer. Check the name, careers URL, industry and logo, then turn on "Show on Misaeng site".'
  const insert = (slug: string) =>
    fetch(`${url}/rest/v1/companies?select=id,slug,name,industry`, {
      method: 'POST',
      headers: { ...storageHeaders('application/json'), Prefer: 'return=representation' },
      body: JSON.stringify({
        slug,
        name,
        industry,
        // 필수 컬럼이라 검색 링크를 넣어 둔다 (관리자가 공식 채용 페이지로 바꾼다)
        careers_url: `https://www.google.com/search?q=${encodeURIComponent(`${name} careers`)}`,
        is_active: false,
        internal_notes: notes,
      }),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)
  let res = await insert(proposedSlug(name))
  if (res?.status === 409) res = await insert(proposedSlug(name))
  if (!res?.ok) {
    if (res) console.error('Company propose error:', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'failed' }
  }
  const row = ((await res.json().catch(() => null)) as { id: string; slug: string; name: string; industry: string }[] | null)?.[0]
  if (!row?.id) return { ok: false, reason: 'failed' }
  return { ok: true, created: true, company: { id: row.id, slug: row.slug, name: row.name, industry: row.industry, pending: true } }
}
