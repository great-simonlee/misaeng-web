import { listActiveCompanies } from '@lib/supabase/companies.server'
import { todayInNewYork, type PostingLevel, type PublicPosting, type WorkArrangement } from '@lib/company/postings'
import { DEGREE_LABELS, JOB_FUNCTIONS, type DegreeLevel, type JobFunction } from '@lib/constants/postingCopy'

/*
 * 채용 공고는 ellieo-erp 관리자 화면(Jobs → Postings)에서 검토하고 Supabase Postgres에 있다
 * (ellieo-erp/supabase/job_postings.sql). 사용자에게는 아래 조건을 모두 만족하는 공고만 보인다.
 *   - 승인됨 (status = approved), 마감 안 됨 (closed_at is null)
 *   - 학생용 (is_student: 인턴·신입), 요약이 공고 내용과 맞음 (summary_status = ok)
 *   - 회사가 사이트에 노출 중 (companies.is_active, 삭제 안 됨)
 * visa_statements(공고 원문 인용)는 관리자 전용이라 읽지 않는다. 이 파일은 읽기만 한다.
 */

const CACHE_TTL_MS = 60_000

// 사용자에게 필요한 컬럼만 읽는다 (원문 인용, 검토 기록, 관리자 메모 제외).
const PUBLIC_COLUMNS = [
  'id',
  'company_id',
  'source_url',
  'title',
  'level',
  'job_function',
  'apply_by',
  'tags',
  'work_arrangement',
  'regions',
  'summary',
  'visa_sponsorship',
  'created_at',
].join(',')

type PostingRow = {
  id: string
  company_id: string
  source_url: string
  title: string
  level: string
  job_function?: string
  apply_by?: string | null
  tags?: string[] | null
  work_arrangement: string
  regions: string[] | null
  summary: {
    overview?: unknown
    qualifications?: unknown
    workType?: unknown
    location?: unknown
    applyNotes?: unknown
    earlyApply?: unknown
    degree?: unknown
  } | null
  visa_sponsorship: string | null
  created_at: string
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

/** ellieo-erp/supabase/job_posting_function.sql, job_posting_deadline.sql 로 추가되는 컬럼 */
const OPTIONAL_COLUMNS = ['job_function', 'apply_by', 'tags']

const LEVELS: PostingLevel[] = ['intern', 'new_grad']

// ellieo-erp guessDegree() 와 같은 규칙: summary.degree 가 없던 예전 요약은 자격요건 문장으로 추정한다.
const GRAD_WORDS = /\b(mba|master'?s?|phd|ph\.d|doctoral|jd|graduate (degree|student|program))\b|석사|대학원|박사/i
const UNDERGRAD_WORDS = /\b(bachelor'?s?|ba|bs|undergraduate|undergrad|sophomore|junior|senior year)\b|학사|학부/i

const ENROLLED = /재학|enrolled|pursuing|currently (a |an )?(student|candidate)/i
const BACHELORS_TO_MASTERS = /bachelor'?s?[- ]to[- ]master'?s?/gi

function postingDegree(value: unknown, qualifications: string[]): DegreeLevel {
  if (typeof value === 'string' && value in DEGREE_LABELS) return value as DegreeLevel
  // 재학 조건 줄이 지원 대상을 말한다 ("학부 졸업 후 2년" 같은 줄에 속지 않도록)
  const eligibility = qualifications.find((l) => ENROLLED.test(l))
  const text = (eligibility ?? qualifications.join('\n')).replace(BACHELORS_TO_MASTERS, 'bachelor')
  const grad = GRAD_WORDS.test(text)
  const undergrad = UNDERGRAD_WORDS.test(text)
  if (grad && undergrad) return 'both'
  if (grad) return 'graduate'
  if (undergrad) return 'undergraduate'
  return 'unspecified'
}
const ARRANGEMENTS: WorkArrangement[] = ['onsite', 'hybrid', 'remote', 'unknown']

const lines = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

let cache: { at: number; value: PublicPosting[] } | null = null

/** 사용자에게 보이는 공고 전체 (최근 등록순). 60초 캐시. */
export async function listPublicPostings(): Promise<PublicPosting[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key) return []

  const filters = '&status=eq.approved&closed_at=is.null&is_student=eq.true&summary_status=eq.ok&order=created_at.desc&limit=500'
  const request = (columns: string) =>
    fetch(`${url}/rest/v1/job_postings?select=${columns}${filters}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)
  const companiesPromise = listActiveCompanies()
  // 나중에 추가된 컬럼(job_function, apply_by) 중 아직 없는 것은 오류 메시지를 보고 하나씩 빼고 다시 읽는다.
  let columns = PUBLIC_COLUMNS.split(',')
  let res = await request(columns.join(','))
  for (let i = 0; i < OPTIONAL_COLUMNS.length && res?.status === 400; i += 1) {
    const message = await res.clone().text().catch(() => '')
    const missing = OPTIONAL_COLUMNS.find((c) => columns.includes(c) && message.includes(c))
    if (!missing) break
    columns = columns.filter((c) => c !== missing)
    res = await request(columns.join(','))
  }
  const companies = await companiesPromise
  if (!res?.ok) {
    // 표가 아직 없으면(job_postings.sql 실행 전) 조용히 빈 목록.
    if (res && res.status !== 404) {
      console.error('Job postings DB error:', res.status, await res.text().catch(() => ''))
    }
    return cache?.value ?? []
  }

  const companyById = new Map(companies.map((c) => [c.id, c]))
  const rows = ((await res.json().catch(() => null)) as PostingRow[] | null) ?? []
  const value: PublicPosting[] = []
  const today = todayInNewYork()
  for (const row of rows) {
    // 지원 마감일이 지난 공고는 숨긴다 (마감일 당일까지는 보인다).
    if (row.apply_by && row.apply_by < today) continue
    const company = companyById.get(row.company_id)
    const overview = lines(row.summary?.overview)
    if (!company || !overview.length || !isHttpsUrl(row.source_url)) continue
    if (!LEVELS.includes(row.level as PostingLevel)) continue
    const qualifications = lines(row.summary?.qualifications)
    value.push({
      id: row.id,
      company: {
        id: company.id,
        slug: company.slug,
        name: company.name,
        logoUrl: company.logoUrl,
        industry: company.industry,
      },
      title: row.title,
      level: row.level as PostingLevel,
      jobFunction: JOB_FUNCTIONS.includes(row.job_function as JobFunction)
        ? (row.job_function as JobFunction)
        : null,
      workArrangement: ARRANGEMENTS.includes(row.work_arrangement as WorkArrangement)
        ? (row.work_arrangement as WorkArrangement)
        : 'unknown',
      regions: Array.isArray(row.regions) ? row.regions : [],
      summary: {
        overview,
        qualifications,
        workType: text(row.summary?.workType),
        location: text(row.summary?.location),
        applyNotes: lines(row.summary?.applyNotes),
        earlyApply: row.summary?.earlyApply === true,
        degree: postingDegree(row.summary?.degree, qualifications),
      },
      noSponsorship: row.visa_sponsorship === 'no',
      applyBy: row.apply_by || null,
      tags: Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === 'string') : [],
      applyUrl: row.source_url,
      postedAt: new Date(row.created_at).getTime(),
    })
  }
  cache = { at: Date.now(), value }
  return value
}

/**
 * "공고 원문 보기" 클릭 1건 기록 (company_clicks, kind = posting).
 * 사용자에게 보이는 공고만 기록한다. ellieo-erp/supabase/job_posting_clicks.sql 실행 전에는 실패(false).
 */
export async function recordPostingClick(input: { postingId: string; userId: string | null }): Promise<boolean> {
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key) return false
  const posting = (await listPublicPostings()).find((p) => p.id === input.postingId)
  if (!posting) return false
  const res = await fetch(`${url}/rest/v1/company_clicks`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      company_id: posting.company.id,
      kind: 'posting',
      posting_id: posting.id,
      user_id: input.userId,
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (res && !res.ok) console.error('Posting click DB error:', res.status, await res.text().catch(() => ''))
  return Boolean(res?.ok)
}

/**
 * 회사의 공식 채용 검색 링크 ("더 많은 공고는 … 공식 채용 사이트에서"): 관리자가 ERP에 등록한
 * 감시 검색(job_watch_searches) 중 켜진 첫 번째. 표가 없거나 등록이 없으면 null.
 */
export async function getCompanyMoreUrl(companyId: string): Promise<string | null> {
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key || !companyId) return null
  const res = await fetch(
    `${url}/rest/v1/job_watch_searches?company_id=eq.${encodeURIComponent(companyId)}&active=eq.true&select=url&order=created_at.asc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) },
  ).catch(() => null)
  if (!res?.ok) return null
  const rows = ((await res.json().catch(() => null)) as { url?: string }[] | null) ?? []
  return isHttpsUrl(rows[0]?.url) ? rows[0]!.url! : null
}

export async function listPublicPostingsForCompany(slug: string): Promise<PublicPosting[]> {
  const key = String(slug || '').trim().toLowerCase()
  return (await listPublicPostings()).filter((p) => p.company.slug === key)
}
