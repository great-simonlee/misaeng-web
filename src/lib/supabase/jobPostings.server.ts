import { listActiveCompanies } from '@lib/supabase/companies.server'
import {
  STUDENT_POSTING_LEVELS,
  todayInNewYork,
  type PostingLevel,
  type PublicPosting,
  type WorkArrangement,
} from '@lib/company/postings'
import { freshSummaryTranslations, type PostingSummaryTranslation } from '@lib/translations/postings'
import type { Locale } from '@lib/i18n/locales'
import { DEGREE_LABELS, JOB_FUNCTIONS, type DegreeLevel, type JobFunction } from '@lib/constants/postingCopy'
import { parsePay, previousPayFor, type PayHistoryRow } from '@lib/company/postingPay'

/*
 * 채용 공고는 ellieo-erp 관리자 화면(Jobs → Postings)에서 검토하고 Supabase Postgres에 있다
 * (ellieo-erp/supabase/job_postings.sql). 사용자에게는 아래 조건을 모두 만족하는 공고만 보인다.
 *   - 승인됨 (status = approved), 마감 안 됨 (closed_at is null)
 *   - 레벨이 인턴·신입·경력 (경력은 예전 앱에 보내지 않는다: forClientLevels), 요약이 공고 내용과 맞음 (summary_status = ok)
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
  'closed_at',
  'summary_translations',
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
    preferred?: unknown
    compensation?: unknown
    benefits?: unknown
    workType?: unknown
    location?: unknown
    applyNotes?: unknown
    earlyApply?: unknown
    alwaysOpen?: unknown
    degree?: unknown
  } | null
  visa_sponsorship: string | null
  created_at: string
  closed_at?: string | null
  /** 다른 언어 요약 (ellieo-erp/supabase/job_posting_translations.sql) */
  summary_translations?: unknown
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

/** ellieo-erp/supabase/job_posting_function.sql, job_posting_deadline.sql 로 추가되는 컬럼 */
const OPTIONAL_COLUMNS = ['job_function', 'apply_by', 'tags', 'summary_translations']

const LEVELS: PostingLevel[] = ['intern', 'new_grad', 'experienced']

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

/** 서버 안에서만 쓰는 공고 (언어별 요약 포함). API는 localizePosting으로 한 언어만 내보낸다. */
export type StoredPosting = PublicPosting & {
  summaryTranslations: Partial<Record<Locale, PostingSummaryTranslation>>
}

let cache: { at: number; value: StoredPosting[] } | null = null

/**
 * 공고 행 읽기 (나중에 추가된 컬럼 중 아직 없는 것은 오류 메시지를 보고 하나씩 빼고 다시 읽는다).
 * null: 읽지 못함 (표가 아직 없으면 조용히, 그 밖의 오류는 로그).
 */
async function fetchPostingRows(filters: string): Promise<PostingRow[] | null> {
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key) return null
  const request = (columns: string) =>
    fetch(`${url}/rest/v1/job_postings?select=${columns}${filters}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)
  let columns = PUBLIC_COLUMNS.split(',')
  let res = await request(columns.join(','))
  for (let i = 0; i < OPTIONAL_COLUMNS.length && res?.status === 400; i += 1) {
    const message = await res.clone().text().catch(() => '')
    const missing = OPTIONAL_COLUMNS.find((c) => columns.includes(c) && message.includes(c))
    if (!missing) break
    columns = columns.filter((c) => c !== missing)
    res = await request(columns.join(','))
  }
  if (!res?.ok) {
    // 표가 아직 없으면(job_postings.sql 실행 전) 조용히 빈 목록.
    if (res && res.status !== 404) {
      console.error('Job postings DB error:', res.status, await res.text().catch(() => ''))
    }
    return null
  }
  return ((await res.json().catch(() => null)) as PostingRow[] | null) ?? []
}

type ListedCompany = Awaited<ReturnType<typeof listActiveCompanies>>[number]

/** 공고 행 → 사용자에게 보이는 공고. 요약이 없거나 링크가 이상하거나 레벨이 다르면 null. */
function toStoredPosting(row: PostingRow, company: ListedCompany | undefined, history: PayHistoryRow[]): StoredPosting | null {
  const overview = lines(row.summary?.overview)
  if (!company || !overview.length || !isHttpsUrl(row.source_url)) return null
  if (!LEVELS.includes(row.level as PostingLevel)) return null
  const qualifications = lines(row.summary?.qualifications)
  return {
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
      preferred: lines(row.summary?.preferred),
      compensation: text(row.summary?.compensation) || null,
      benefits: lines(row.summary?.benefits),
      workType: text(row.summary?.workType),
      location: text(row.summary?.location),
      applyNotes: lines(row.summary?.applyNotes),
      earlyApply: row.summary?.earlyApply === true,
      // 마감일이 있으면 마감일이 우선
      alwaysOpen: row.summary?.alwaysOpen === true && !row.apply_by,
      degree: postingDegree(row.summary?.degree, qualifications),
      // 한국어 지원 팁에 "빨리 지원" 내용이 이미 있는지 (번역문으로는 판단할 수 없어 원문에서 미리 본다)
      earlyApplyMentioned: lines(row.summary?.applyNotes).some((n) => /빨리|일찍|수시/.test(n)),
    },
    summaryTranslations: freshSummaryTranslations(row.summary, row.summary_translations),
    noSponsorship: row.visa_sponsorship === 'no',
    applyBy: row.apply_by || null,
    tags: Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === 'string') : [],
    applyUrl: row.source_url,
    postedAt: new Date(row.created_at).getTime(),
    // 급여는 한국어 원문 요약에서 뽑는다 (번역문은 앱이 보여 주기만)
    pay: parsePay(text(row.summary?.compensation)),
    previousPay: previousPayFor(
      { id: row.id, companyId: row.company_id, title: row.title, level: row.level, createdAt: new Date(row.created_at).getTime() },
      history,
    ),
  }
}

/** 사용자에게 보이는 공고 전체 (최근 등록순). 60초 캐시. */
export async function listPublicPostings(): Promise<StoredPosting[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  // 인턴·신입·경력 (ellieo-erp postingListRules.mjs isLivePosting 과 같은 기준). 레벨 unknown 은 보이지 않는다.
  const filters = `&status=eq.approved&closed_at=is.null&level=in.(${LEVELS.join(',')})&summary_status=eq.ok&order=created_at.desc&limit=1000`
  const [rows, companies, history] = await Promise.all([fetchPostingRows(filters), listActiveCompanies(), listPayHistory()])
  if (!rows) return cache?.value ?? []
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const value: StoredPosting[] = []
  const today = todayInNewYork()
  for (const row of rows) {
    // 지원 마감일이 지난 공고는 숨긴다 (마감일 당일까지는 보인다).
    if (row.apply_by && row.apply_by < today) continue
    const posting = toStoredPosting(row, companyById.get(row.company_id), history)
    if (posting) value.push(posting)
  }
  cache = { at: Date.now(), value }
  return value
}

/**
 * 회사의 마감된 공고 (회사 페이지 "마감된 공고"): 승인·요약됐던 공고 중 채용이 끝났거나 지원 마감일이 지난 것,
 * 최근 등록순 200개까지. closedAt = 마감된 때 (마감일만 지난 공고는 마감일).
 */
export async function listClosedPostingsForCompany(slug: string): Promise<StoredPosting[]> {
  const company = (await listActiveCompanies()).find((c) => c.slug === String(slug || '').trim().toLowerCase())
  if (!company) return []
  const today = todayInNewYork()
  const base = `&company_id=eq.${encodeURIComponent(company.id)}&status=eq.approved&level=in.(${LEVELS.join(',')})&summary_status=eq.ok&order=created_at.desc&limit=200`
  // apply_by 컬럼이 없던 시절과 같이 쓰도록 둘로 나눠 읽는다: 종료된 공고 + 마감일이 지난 공고
  const [closedRows, pastRows, history] = await Promise.all([
    fetchPostingRows(`${base}&closed_at=not.is.null`),
    fetchPostingRows(`${base}&closed_at=is.null&apply_by=lt.${today}`),
    listPayHistory(),
  ])
  const seen = new Set<string>()
  const value: StoredPosting[] = []
  for (const row of [...(closedRows ?? []), ...(pastRows ?? [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const posting = toStoredPosting(row, company, history)
    if (!posting) continue
    const closedAt = row.closed_at ? new Date(row.closed_at).getTime() : new Date(`${row.apply_by}T23:59:59-05:00`).getTime()
    value.push({ ...posting, closedAt })
  }
  return value.sort((a, b) => b.postedAt - a.postedAt)
}

let historyCache: { at: number; value: PayHistoryRow[] } | null = null
const HISTORY_TTL_MS = 10 * 60_000

type HistoryRow = {
  id: string
  company_id: string
  title: string
  level: string
  created_at: string
  closed_at: string | null
  apply_by?: string | null
  compensation: string | null
}

/**
 * 급여 비교용 공고 기록: 승인된 공고 전부 (마감·종료된 지난 공고 포함), 급여 문장만.
 * 해마다 다시 열리는 같은 포지션의 급여를 비교한다. 10분 캐시.
 */
export async function listPayHistory(): Promise<PayHistoryRow[]> {
  if (historyCache && Date.now() - historyCache.at < HISTORY_TTL_MS) return historyCache.value
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key) return []
  const request = (deadline: boolean) =>
    fetch(
      `${url}/rest/v1/job_postings?select=id,company_id,title,level,created_at,closed_at${deadline ? ',apply_by' : ''},compensation:summary->>compensation` +
        `&status=eq.approved&level=in.(${LEVELS.join(',')})&order=created_at.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) },
    ).catch(() => null)
  let res = await request(true)
  if (res?.status === 400) res = await request(false)
  if (!res?.ok) return historyCache?.value ?? []
  const rows = ((await res.json().catch(() => null)) as HistoryRow[] | null) ?? []
  const today = todayInNewYork()
  const value = rows.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    level: row.level,
    pay: parsePay(row.compensation),
    createdAt: new Date(row.created_at).getTime(),
    open: !row.closed_at && !(row.apply_by && row.apply_by < today),
  }))
  historyCache = { at: Date.now(), value }
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
  const posting = await getPublicPosting(input.postingId)
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

/** 사용자에게 보이는 공고 하나 (공유 링크 /[city]/companies/postings/[id]). 숨겨진·마감된 공고는 null. */
export async function getPublicPosting(id: string): Promise<StoredPosting | null> {
  const key = String(id || '').trim()
  if (!key) return null
  return (await listPublicPostings()).find((p) => p.id === key) ?? null
}

export async function listPublicPostingsForCompany(slug: string): Promise<StoredPosting[]> {
  const key = String(slug || '').trim().toLowerCase()
  return (await listPublicPostings()).filter((p) => p.company.slug === key)
}

/** ?levels=all 을 보내지 않는 예전 앱(경력 칩·문구가 없음)에는 인턴·신입 공고만 보낸다. */
export function forClientLevels<T extends { level: PostingLevel }>(postings: T[], request: Request): T[] {
  if (new URL(request.url).searchParams.get('levels') === 'all') return postings
  return postings.filter((p) => STUDENT_POSTING_LEVELS.includes(p.level))
}
