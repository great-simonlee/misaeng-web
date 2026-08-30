import type { JobReviewTimelineEntry, JobReviewTypeId } from '@/types/nyc'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'

export type { JobReviewTimelineEntry, JobReviewTypeId } from '@/types/nyc'

export type JobReviewTimelineFieldKey =
  | 'stageLabel'
  | 'platform'
  | 'documentsSubmitted'
  | 'interviewRound'
  | 'outcome'

export const JOB_REVIEW_TYPES: {
  id: JobReviewTypeId
  label: string
  description: string
  summary: string
}[] = [
  {
    id: 'intern',
    label: '인턴',
    description: 'Summer / Co-op / 학기 중 인턴',
    summary: '서류 → OA → 면접 → 오퍼까지의 전형',
  },
  {
    id: 'new-grad',
    label: '신입',
    description: '졸업 후 풀타임 · New Grad',
    summary: '캠퍼스 리크루팅·온라인 지원 후기',
  },
  {
    id: 'experienced',
    label: '경력',
    description: 'Mid / Senior 레벨 채용',
    summary: '리크루터 연락부터 멀티 라운드 면접',
  },
  {
    id: 'job-change',
    label: '이직',
    description: '재직 중·퇴사 후 이직 지원',
    summary: '현직 병행 지원·오퍼 협상까지의 과정',
  },
  {
    id: 'contract',
    label: '계약',
    description: 'Contract · Freelance · Part-time',
    summary: '단기·프로젝트 기반 채용 과정',
  },
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
    pickerActive:
      'bg-[#eff6ff] ring-[#1d4ed8] shadow-[0_0_0_1px_rgba(29,78,216,0.08)]',
    accent: '#1d4ed8',
    soft: '#eff6ff',
  },
  'new-grad': {
    badge: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#0f766e]/25',
    pickerActive:
      'bg-[#eefaf4] ring-[#0f766e] shadow-[0_0_0_1px_rgba(15,118,110,0.08)]',
    accent: '#0f766e',
    soft: '#eefaf4',
  },
  experienced: {
    badge: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#c4b5fd]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#6d28d9]/25',
    pickerActive:
      'bg-[#f5f3ff] ring-[#6d28d9] shadow-[0_0_0_1px_rgba(109,40,217,0.08)]',
    accent: '#6d28d9',
    soft: '#f5f3ff',
  },
  'job-change': {
    badge: 'bg-[#fdf2f8] text-[#be185d] ring-[#f9a8d4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#be185d]/25',
    pickerActive:
      'bg-[#fdf2f8] ring-[#be185d] shadow-[0_0_0_1px_rgba(190,24,93,0.08)]',
    accent: '#be185d',
    soft: '#fdf2f8',
  },
  contract: {
    badge: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#c2410c]/25',
    pickerActive:
      'bg-[#fff7ed] ring-[#c2410c] shadow-[0_0_0_1px_rgba(194,65,12,0.08)]',
    accent: '#c2410c',
    soft: '#fff7ed',
  },
}

export const JOB_REVIEW_TIMELINE_FIELDS: {
  key: JobReviewTimelineFieldKey
  label: string
  shortLabel: string
  hint: string
  rowClass: string
  labelClass: string
}[] = [
  {
    key: 'stageLabel',
    label: '어떤 단계인지',
    shortLabel: '단계',
    hint: '서류, OA, Phone, Onsite, Offer 등',
    rowClass: 'border-l-[3px] border-[#60a5fa] bg-[#f8fbff]',
    labelClass: 'text-[#1d4ed8]',
  },
  {
    key: 'platform',
    label: '어디서 지원했는지',
    shortLabel: '플랫폼',
    hint: 'LinkedIn, Handshake, Referral, 회사 careers',
    rowClass: 'border-l-[3px] border-[#a78bfa] bg-[#faf8ff]',
    labelClass: 'text-[#6d28d9]',
  },
  {
    key: 'documentsSubmitted',
    label: '어떤 서류를 넣었는지',
    shortLabel: '서류',
    hint: 'Resume, Cover letter, Portfolio, Transcript',
    rowClass: 'border-l-[3px] border-[#fbbf24] bg-[#fffdf5]',
    labelClass: 'text-[#b45309]',
  },
  {
    key: 'interviewRound',
    label: '몇 차 면접인지',
    shortLabel: '면접',
    hint: '1차 HR, 2차 Tech, Panel, HM 등',
    rowClass: 'border-l-[3px] border-[#34d399] bg-[#f6fffb]',
    labelClass: 'text-[#047857]',
  },
  {
    key: 'outcome',
    label: '결과는 어땠는지',
    shortLabel: '결과',
    hint: 'Pass, Reject, Pending, Offer 등',
    rowClass: 'border-l-[3px] border-[#fb7185] bg-[#fff8f8]',
    labelClass: 'text-[#e11d48]',
  },
]

const JOB_REVIEW_PLACEHOLDERS: Record<
  JobReviewTypeId,
  Record<JobReviewTimelineFieldKey, string>
> = {
  intern: {
    stageLabel: '예: Online Assessment',
    platform: '예: Handshake → 회사 careers',
    documentsSubmitted: '예: Resume, Transcript, Cover letter',
    interviewRound: '예: 1차 Recruiter screen',
    outcome: '예: Pass → 다음 라운드 일정 잡힘',
  },
  'new-grad': {
    stageLabel: '예: 서류 지원',
    platform: '예: LinkedIn Easy Apply',
    documentsSubmitted: '예: Resume PDF, GitHub 링크',
    interviewRound: '예: Phone screen',
    outcome: '예: Reject (2주 후 이메일)',
  },
  experienced: {
    stageLabel: '예: Recruiter reach-out',
    platform: '예: LinkedIn InMail',
    documentsSubmitted: '예: Updated resume',
    interviewRound: '예: HM 1:1',
    outcome: '예: Onsite invite',
  },
  'job-change': {
    stageLabel: '예: Recruiter screen',
    platform: '예: LinkedIn / Referral',
    documentsSubmitted: '예: Resume, LinkedIn',
    interviewRound: '예: HM + Team',
    outcome: '예: Offer · 연봉 협상',
  },
  contract: {
    stageLabel: '예: 에이전시 서류',
    platform: '예: Recruiter referral',
    documentsSubmitted: '예: Resume, rate card',
    interviewRound: '예: Client intro call',
    outcome: '예: Contract offer',
  },
}

export const JOB_REVIEW_QUICK_STEPS: Record<
  JobReviewTypeId,
  { label: string; patch: Partial<JobReviewTimelineEntry> }[]
> = {
  intern: [
    {
      label: '서류 지원',
      patch: {
        stageLabel: '서류 지원',
        platform: 'Handshake / LinkedIn',
        documentsSubmitted: 'Resume, Transcript',
      },
    },
    {
      label: 'OA',
      patch: {
        stageLabel: 'Online Assessment',
        interviewRound: 'OA',
      },
    },
    {
      label: '면접',
      patch: {
        stageLabel: 'Technical Interview',
        interviewRound: '1차 Tech',
      },
    },
    {
      label: '오퍼',
      patch: {
        stageLabel: 'Offer',
        outcome: 'Offer received',
      },
    },
  ],
  'new-grad': [
    {
      label: '지원',
      patch: {
        stageLabel: '서류 지원',
        platform: '회사 careers portal',
        documentsSubmitted: 'Resume, Cover letter',
      },
    },
    {
      label: 'Phone',
      patch: {
        stageLabel: 'Phone Screen',
        interviewRound: '1차 HR',
      },
    },
    {
      label: 'Onsite',
      patch: {
        stageLabel: 'Onsite / Virtual onsite',
        interviewRound: 'Final round',
      },
    },
  ],
  experienced: [
    {
      label: '리크루터',
      patch: {
        stageLabel: 'Recruiter screen',
        platform: 'LinkedIn InMail',
      },
    },
    {
      label: 'HM',
      patch: {
        stageLabel: 'Hiring Manager',
        interviewRound: 'HM 1:1',
      },
    },
    {
      label: 'Panel',
      patch: {
        stageLabel: 'Panel interview',
        interviewRound: 'Team panel',
      },
    },
  ],
  'job-change': [
    {
      label: '지원',
      patch: {
        stageLabel: '서류 지원',
        platform: 'LinkedIn / Referral',
        documentsSubmitted: 'Resume',
      },
    },
    {
      label: '면접',
      patch: {
        stageLabel: 'Hiring Manager',
        interviewRound: 'HM + Team',
      },
    },
    {
      label: '오퍼',
      patch: {
        stageLabel: 'Offer · 협상',
        outcome: 'Offer received',
      },
    },
  ],
  contract: [
    {
      label: '서류',
      patch: {
        stageLabel: '서류 제출',
        documentsSubmitted: 'Resume',
      },
    },
    {
      label: '클라이언트',
      patch: {
        stageLabel: 'Client interview',
        interviewRound: 'Intro call',
      },
    },
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
  detailFallback?: string,
): JobReviewTypeId | null {
  if (isJobReviewTypeId(raw)) return raw
  const detail = String(detailFallback || '').trim().toLowerCase()
  if (detail.includes('인턴') || detail === 'intern') return 'intern'
  if (detail.includes('신입') || detail.includes('new')) return 'new-grad'
  if (detail.includes('이직') || detail.includes('job-change')) return 'job-change'
  if (detail.includes('경력') || detail.includes('experienced')) return 'experienced'
  if (detail.includes('계약') || detail.includes('contract')) return 'contract'
  return null
}

export function hasJobReviewPostUpdate(post: {
  createdAt: number
  updatedAt: number
}) {
  return post.updatedAt - post.createdAt > JOB_REVIEW_UPDATE_EPSILON_MS
}

export function getJobReviewListTimestamp(post: {
  createdAt: number
  updatedAt: number
}) {
  return post.updatedAt || post.createdAt
}

export function sortJobReviewTimelineByDate(
  entries: JobReviewTimelineEntry[],
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
  const parts = [
    entry.stageLabel,
    entry.platform,
    entry.interviewRound,
    entry.outcome,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
  const summary = parts.join(' · ')
  if (summary) return summary
  const plain = htmlToPlainText(entry.stageReviewHtml || '')
  if (!plain) return ''
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain
}

export function getLatestJobReviewTimelineEntryId(
  entries: JobReviewTimelineEntry[],
): string | null {
  const sorted = sortJobReviewTimelineByDate(entries)
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const entry = sorted[index]
    if (summarizeJobReviewTimelineEntry(entry)) return entry.id
  }
  return null
}

export function getJobReviewTypeLabel(type: JobReviewTypeId | null | undefined) {
  return JOB_REVIEW_TYPES.find((item) => item.id === type)?.label ?? ''
}

export function getJobReviewTypeStyle(type: JobReviewTypeId | null | undefined) {
  if (type && type in JOB_REVIEW_TYPE_STYLES) return JOB_REVIEW_TYPE_STYLES[type]
  return JOB_REVIEW_TYPE_STYLES.intern
}

export function getJobReviewTimelinePlaceholder(
  type: JobReviewTypeId | null | undefined,
  field: JobReviewTimelineFieldKey,
) {
  if (type) return JOB_REVIEW_PLACEHOLDERS[type][field]
  return JOB_REVIEW_PLACEHOLDERS.intern[field]
}

export function getJobReviewTimelineDateRange(
  timeline: JobReviewTimelineEntry[] | null | undefined,
) {
  const dates = (timeline ?? [])
    .map((entry) => entry.date.trim())
    .filter(Boolean)
    .sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatJobReviewDate(dates[0])
  return `${formatJobReviewDate(dates[0])} – ${formatJobReviewDate(dates[dates.length - 1])}`
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
  return sanitizeCommunityHtml(
    `<p>${escapeLegacyReviewText(details)}</p>`,
  ).slice(0, JOB_REVIEW_STAGE_REVIEW_MAX)
}

export function normalizeJobReviewTimeline(
  raw: unknown,
): JobReviewTimelineEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Record<string, unknown>
      const date = String(data.date || '').trim()
      const stageLabel = String(data.stageLabel || '').trim()
      const platform = String(data.platform || '').trim()
      const documentsSubmitted = String(data.documentsSubmitted || '').trim()
      const interviewRound = String(data.interviewRound || '').trim()
      const legacyDetails = String(data.details || '').trim()
      const stageReviewHtml = normalizeStageReviewHtml(
        data.stageReviewHtml,
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
        id:
          String(data.id || '').trim() ||
          `jr_${index}_${Math.random().toString(36).slice(2, 7)}`,
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

export function formatJobReviewDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
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
      entry.outcome.trim(),
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
      entry.outcome.trim(),
  )
}

export function isJobReviewBoard(id: string) {
  return id === 'job-review'
}
