import { PARTNER_ORGS } from '@lib/constants/partners'
import type {
  JobReviewOutcomeId,
  JobReviewSourceId,
  JobReviewTimelineEntry,
  JobReviewTypeId,
} from '@/types/nyc'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { formatDate } from '@lib/i18n/format'
import type { Locale } from '@lib/i18n/locales'

export type { JobReviewTimelineEntry, JobReviewTypeId } from '@/types/nyc'

export type JobReviewTimelineFieldKey =
  | 'stageLabel'
  | 'platform'
  | 'documentsSubmitted'
  | 'interviewRound'
  | 'outcome'

/**
 * `label`은 화면 문구가 아니라 저장값이다 (글의 `detail` 컬럼에 그대로 저장됨).
 * 화면에는 `t('reviews.jobReview.types.<id>.label')`을 쓴다.
 */
export const JOB_REVIEW_TYPES: {
  id: JobReviewTypeId
  label: string
}[] = [
  { id: 'intern', label: '인턴' },
  { id: 'new-grad', label: '신입' },
  { id: 'experienced', label: '경력' },
  { id: 'job-change', label: '이직' },
  { id: 'contract', label: '계약' },
]

export const JOB_REVIEW_TYPE_STYLES: Record<
  JobReviewTypeId,
  {
    badge: string
    picker: string
    pickerActive: string
    accent: string
    soft: string
  }
> = {
  intern: {
    badge: 'bg-[#eff6ff] text-[#1d4ed8] ring-[#93c5fd]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#1d4ed8]/25',
    pickerActive: 'bg-[#eff6ff] ring-[#1d4ed8] shadow-[0_0_0_1px_rgba(29,78,216,0.08)]',
    accent: '#1d4ed8',
    soft: '#eff6ff',
  },
  'new-grad': {
    badge: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#0f766e]/25',
    pickerActive: 'bg-[#eefaf4] ring-[#0f766e] shadow-[0_0_0_1px_rgba(15,118,110,0.08)]',
    accent: '#0f766e',
    soft: '#eefaf4',
  },
  experienced: {
    badge: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#c4b5fd]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#6d28d9]/25',
    pickerActive: 'bg-[#f5f3ff] ring-[#6d28d9] shadow-[0_0_0_1px_rgba(109,40,217,0.08)]',
    accent: '#6d28d9',
    soft: '#f5f3ff',
  },
  'job-change': {
    badge: 'bg-[#fdf2f8] text-[#be185d] ring-[#f9a8d4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#be185d]/25',
    pickerActive: 'bg-[#fdf2f8] ring-[#be185d] shadow-[0_0_0_1px_rgba(190,24,93,0.08)]',
    accent: '#be185d',
    soft: '#fdf2f8',
  },
  contract: {
    badge: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#c2410c]/25',
    pickerActive: 'bg-[#fff7ed] ring-[#c2410c] shadow-[0_0_0_1px_rgba(194,65,12,0.08)]',
    accent: '#c2410c',
    soft: '#fff7ed',
  },
}

export const JOB_REVIEW_TIMELINE_FIELDS: {
  key: JobReviewTimelineFieldKey
  /** true면 `reviews.jobReview.fields.<key>.guide` 안내를 함께 보여 준다 */
  hasGuide?: boolean
  rowClass: string
  labelClass: string
}[] = [
  {
    key: 'stageLabel',
    rowClass: 'border-l-[3px] border-[#60a5fa] bg-[#f8fbff]',
    labelClass: 'text-[#1d4ed8]',
  },
  {
    key: 'platform',
    rowClass: 'border-l-[3px] border-[#a78bfa] bg-[#faf8ff]',
    labelClass: 'text-[#6d28d9]',
  },
  {
    key: 'documentsSubmitted',
    rowClass: 'border-l-[3px] border-[#fbbf24] bg-[#fffdf5]',
    labelClass: 'text-[#b45309]',
  },
  {
    key: 'interviewRound',
    hasGuide: true,
    rowClass: 'border-l-[3px] border-[#34d399] bg-[#f6fffb]',
    labelClass: 'text-[#047857]',
  },
  {
    key: 'outcome',
    rowClass: 'border-l-[3px] border-[#fb7185] bg-[#fff8f8]',
    labelClass: 'text-[#e11d48]',
  },
]

/**
 * 단계 빠른 입력. 버튼 이름은 `reviews.jobReview.quickSteps.<type>.<id>.label`,
 * 채워 넣는 값은 `reviews.jobReview.quickSteps.<type>.<id>.<field>`.
 */
export const JOB_REVIEW_QUICK_STEPS: Record<
  JobReviewTypeId,
  { id: string; fields: JobReviewTimelineFieldKey[] }[]
> = {
  intern: [
    { id: 'apply', fields: ['stageLabel', 'platform', 'documentsSubmitted'] },
    { id: 'interview', fields: ['stageLabel', 'interviewRound'] },
    { id: 'offer', fields: ['stageLabel', 'outcome'] },
  ],
  'new-grad': [
    { id: 'apply', fields: ['stageLabel', 'platform', 'documentsSubmitted'] },
    { id: 'phone', fields: ['stageLabel', 'interviewRound'] },
    { id: 'onsite', fields: ['stageLabel', 'interviewRound'] },
  ],
  experienced: [
    { id: 'recruiter', fields: ['stageLabel', 'platform'] },
    { id: 'hm', fields: ['stageLabel', 'interviewRound'] },
    { id: 'panel', fields: ['stageLabel', 'interviewRound'] },
  ],
  'job-change': [
    { id: 'apply', fields: ['stageLabel', 'platform', 'documentsSubmitted'] },
    { id: 'interview', fields: ['stageLabel', 'interviewRound'] },
    { id: 'offer', fields: ['stageLabel', 'outcome'] },
  ],
  contract: [
    { id: 'documents', fields: ['stageLabel', 'documentsSubmitted'] },
    { id: 'client', fields: ['stageLabel', 'interviewRound'] },
  ],
}

export const JOB_REVIEW_TIMELINE_MAX = 20
export const JOB_REVIEW_FIELD_MAX = 320
export const JOB_REVIEW_STAGE_REVIEW_MAX = COMMUNITY_BODY_MAX
export const JOB_REVIEW_TIPS_MAX = 800
export const JOB_REVIEW_UPDATE_EPSILON_MS = 60_000

export function isJobReviewTypeId(value: unknown): value is JobReviewTypeId {
  return (
    value === 'intern' ||
    value === 'new-grad' ||
    value === 'experienced' ||
    value === 'job-change' ||
    value === 'contract'
  )
}

export function normalizeJobReviewType(
  raw: unknown,
  detailFallback?: string
): JobReviewTypeId | null {
  if (isJobReviewTypeId(raw)) return raw
  const detail = String(detailFallback || '')
    .trim()
    .toLowerCase()
  if (detail.includes('인턴') || detail === 'intern') return 'intern'
  if (detail.includes('신입') || detail.includes('new')) return 'new-grad'
  if (detail.includes('이직') || detail.includes('job-change')) return 'job-change'
  if (detail.includes('경력') || detail.includes('experienced')) return 'experienced'
  if (detail.includes('계약') || detail.includes('contract')) return 'contract'
  return null
}

export function hasJobReviewPostUpdate(post: { createdAt: number; updatedAt: number }) {
  return post.updatedAt - post.createdAt > JOB_REVIEW_UPDATE_EPSILON_MS
}

export function getJobReviewListTimestamp(post: { createdAt: number; updatedAt: number }) {
  return post.updatedAt || post.createdAt
}

export function sortJobReviewTimelineByDate(
  entries: JobReviewTimelineEntry[]
): JobReviewTimelineEntry[] {
  return [...entries].sort((a, b) => {
    const da = a.date.trim()
    const db = b.date.trim()
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
}

export function summarizeJobReviewTimelineEntry(entry: JobReviewTimelineEntry) {
  const parts = [entry.stageLabel, entry.platform, entry.interviewRound, entry.outcome]
    .map((value) => value.trim())
    .filter(Boolean)
  const summary = parts.join(' · ')
  if (summary) return summary
  const plain = htmlToPlainText(entry.stageReviewHtml || '')
  if (!plain) return ''
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain
}

export function getLatestJobReviewTimelineEntryId(
  entries: JobReviewTimelineEntry[]
): string | null {
  const sorted = sortJobReviewTimelineByDate(entries)
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const entry = sorted[index]
    if (summarizeJobReviewTimelineEntry(entry)) return entry.id
  }
  return null
}

/** 저장용 유형 이름 (`detail` 컬럼). 화면 표시는 `t('reviews.jobReview.types.<id>.label')` */
export function getJobReviewTypeLabel(type: JobReviewTypeId | null | undefined) {
  return JOB_REVIEW_TYPES.find((item) => item.id === type)?.label ?? ''
}

export function getJobReviewTypeStyle(type: JobReviewTypeId | null | undefined) {
  if (type && type in JOB_REVIEW_TYPE_STYLES) return JOB_REVIEW_TYPE_STYLES[type]
  return JOB_REVIEW_TYPE_STYLES.intern
}

export function getJobReviewTimelineDateRange(
  timeline: JobReviewTimelineEntry[] | null | undefined,
  locale: Locale = 'ko',
) {
  const dates = [
    ...new Set(
      (timeline ?? [])
        .map((entry) => entry.date.trim())
        .filter(Boolean),
    ),
  ].sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatJobReviewDate(dates[0], { compactYear: true, locale })
  return `${formatJobReviewDate(dates[0], { compactYear: true, locale })} – ${formatJobReviewDate(dates[dates.length - 1], { compactYear: true, locale })}`
}

function escapeLegacyReviewText(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br />')
}

function normalizeStageReviewHtml(raw: unknown, legacyDetails?: string) {
  const html = String(raw || '').trim()
  if (html) {
    return sanitizeCommunityHtml(html).slice(0, JOB_REVIEW_STAGE_REVIEW_MAX)
  }
  const details = String(legacyDetails || '').trim()
  if (!details) return ''
  return sanitizeCommunityHtml(`<p>${escapeLegacyReviewText(details)}</p>`).slice(
    0,
    JOB_REVIEW_STAGE_REVIEW_MAX
  )
}

/** Storage JSON·레거시 필드에서 타임라인 원본 coalesce */
export function coalesceJobReviewTimelineRaw(
  data: Record<string, unknown>,
): unknown {
  const candidates = [
    data.jobReviewTimeline,
    data.job_review_timeline,
    data.timeline,
  ]
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) return candidate
  }
  return undefined
}

function parseJobReviewTimelineArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parseJobReviewTimelineArray(parsed)
    } catch {
      return null
    }
  }
  if (raw && typeof raw === 'object') {
    const entries = (raw as Record<string, unknown>).entries
    if (Array.isArray(entries)) return entries
  }
  return null
}

export function normalizeJobReviewTimeline(raw: unknown): JobReviewTimelineEntry[] {
  const items = parseJobReviewTimelineArray(raw)
  if (!items) return []
  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Record<string, unknown>
      const date = String(data.date || '').trim()
      const stageLabel = String(
        data.stageLabel || data.stage || data.step || data.label || '',
      ).trim()
      const platform = String(data.platform || '').trim()
      const documentsSubmitted = String(data.documentsSubmitted || '').trim()
      const interviewRound = String(
        data.interviewRound || data.interview || '',
      ).trim()
      const legacyDetails = String(data.details || data.detail || '').trim()
      const stageReviewHtml = normalizeStageReviewHtml(
        data.stageReviewHtml ?? data.review ?? data.note ?? data.content,
        legacyDetails,
      )
      const outcome = String(data.outcome || '').trim()
      if (
        !date &&
        !stageLabel &&
        !platform &&
        !documentsSubmitted &&
        !interviewRound &&
        !stageReviewHtml &&
        !outcome
      ) {
        return null
      }
      return {
        id: String(data.id || '').trim() || `jr_${index}_${Math.random().toString(36).slice(2, 7)}`,
        date,
        stageLabel: stageLabel.slice(0, JOB_REVIEW_FIELD_MAX),
        platform: platform.slice(0, JOB_REVIEW_FIELD_MAX),
        documentsSubmitted: documentsSubmitted.slice(0, JOB_REVIEW_FIELD_MAX),
        interviewRound: interviewRound.slice(0, JOB_REVIEW_FIELD_MAX),
        stageReviewHtml,
        outcome: outcome.slice(0, JOB_REVIEW_FIELD_MAX),
      }
    })
    .filter((item): item is JobReviewTimelineEntry => Boolean(item))
    .slice(0, JOB_REVIEW_TIMELINE_MAX)
}

export function normalizeJobReviewTips(raw: unknown) {
  return String(raw || '')
    .trim()
    .slice(0, JOB_REVIEW_TIPS_MAX)
}

export function formatJobReviewDate(
  value: string,
  options?: { compactYear?: boolean; locale?: Locale },
) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return formatDate(options?.locale ?? 'ko', date, {
        year: options?.compactYear ? '2-digit' : 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }
  return trimmed
}

export function createEmptyJobReviewTimelineEntry(): JobReviewTimelineEntry {
  return {
    id: `jr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    date: '',
    stageLabel: '',
    platform: '',
    documentsSubmitted: '',
    interviewRound: '',
    stageReviewHtml: '',
    outcome: '',
  }
}

function hasStageReviewContent(entry: JobReviewTimelineEntry) {
  return Boolean(htmlToPlainText(entry.stageReviewHtml || ''))
}

export function isJobReviewTimelineEntryFilled(entry: JobReviewTimelineEntry) {
  return Boolean(
    entry.date.trim() ||
    entry.stageLabel.trim() ||
    entry.platform.trim() ||
    entry.documentsSubmitted.trim() ||
    entry.interviewRound.trim() ||
    hasStageReviewContent(entry) ||
    entry.outcome.trim()
  )
}

export function isJobReviewTimelineEntryComplete(entry: JobReviewTimelineEntry) {
  if (!entry.date.trim()) return false
  return Boolean(
    entry.stageLabel.trim() ||
    entry.platform.trim() ||
    entry.documentsSubmitted.trim() ||
    entry.interviewRound.trim() ||
    hasStageReviewContent(entry) ||
    entry.outcome.trim()
  )
}

/** 후기를 남기게 된 경로. 작성 시 필수, 공개되지 않음 (ellieo-erp에서 관리) */
export type { JobReviewOutcomeId, JobReviewSourceId }

/** 화면 문구: `reviews.jobReview.sources.<id>.label` / `.description` */
export const JOB_REVIEW_SOURCES: readonly { id: JobReviewSourceId }[] = [
  { id: 'misaeng' },
  { id: 'student-org' },
  { id: 'referral' },
  { id: 'other' },
]

export function isJobReviewSourceId(value: unknown): value is JobReviewSourceId {
  return JOB_REVIEW_SOURCES.some((item) => item.id === value)
}

export function isPartnerOrgId(value: unknown): value is string {
  return PARTNER_ORGS.some((org) => org.id === value)
}

/** storage 값 → {source, orgId}. 예전 'kiso'는 NYU 한인학생회(nyu-kiso)로 읽는다. */
export function normalizeJobReviewSource(
  source: unknown,
  orgId: unknown,
): { source: JobReviewSourceId | null; orgId: string | null } {
  if (source === 'kiso') return { source: 'student-org', orgId: 'nyu-kiso' }
  if (!isJobReviewSourceId(source)) return { source: null, orgId: null }
  if (source !== 'student-org') return { source, orgId: null }
  return { source, orgId: isPartnerOrgId(orgId) ? orgId : null }
}

/** 작성 요청 검증: student-org면 학생회 선택까지 필수 */
export function parseJobReviewSourceInput(
  source: unknown,
  orgId: unknown,
): { source: JobReviewSourceId; orgId: string | null } | null {
  if (!isJobReviewSourceId(source)) return null
  if (source !== 'student-org') return { source, orgId: null }
  return isPartnerOrgId(orgId) ? { source, orgId } : null
}

/** 화면 문구: `reviews.jobReview.outcomes.<id>.label` / `.description` */
export const JOB_REVIEW_OUTCOMES: readonly { id: JobReviewOutcomeId }[] = [
  { id: 'offer' },
  { id: 'rejected' },
  { id: 'in-progress' },
  { id: 'withdrew' },
]

export function isJobReviewOutcomeId(value: unknown): value is JobReviewOutcomeId {
  return JOB_REVIEW_OUTCOMES.some((item) => item.id === value)
}

export function isJobReviewBoard(id: string) {
  return id === 'job-review'
}
