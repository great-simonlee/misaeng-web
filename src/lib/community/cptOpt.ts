import type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { formatDate } from '@lib/i18n/format'
import type { Locale } from '@lib/i18n/locales'

export type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'

export type CptOptTimelineFieldKey =
  | 'prepared'
  | 'submitted'
  | 'resultReceived'
  | 'nextStep'

/**
 * `label`은 화면 문구가 아니라 저장값이다 (글의 `detail` 컬럼에 그대로 저장됨).
 * 화면에는 `t('reviews.cptOpt.types.<id>.label')`을 쓴다.
 */
export const CPT_OPT_TYPES: {
  id: CptOptTypeId
  label: string
}[] = [
  { id: 'cpt', label: 'CPT' },
  { id: 'opt', label: 'OPT' },
  { id: 'stem-opt', label: 'STEM OPT' },
  { id: 'visa', label: '비자' },
  { id: 'green-card', label: '영주권' },
]

export const CPT_OPT_TYPE_STYLES: Record<
  CptOptTypeId,
  {
    badge: string
    picker: string
    pickerActive: string
    accent: string
    soft: string
  }
> = {
  cpt: {
    badge: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#0f766e]/25',
    pickerActive:
      'bg-[#eefaf4] ring-[#0f766e] shadow-[0_0_0_1px_rgba(15,118,110,0.08)]',
    accent: '#0f766e',
    soft: '#eefaf4',
  },
  opt: {
    badge: 'bg-[#eff6ff] text-[#1d4ed8] ring-[#93c5fd]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#1d4ed8]/25',
    pickerActive:
      'bg-[#eff6ff] ring-[#1d4ed8] shadow-[0_0_0_1px_rgba(29,78,216,0.08)]',
    accent: '#1d4ed8',
    soft: '#eff6ff',
  },
  'stem-opt': {
    badge: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#c4b5fd]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#6d28d9]/25',
    pickerActive:
      'bg-[#f5f3ff] ring-[#6d28d9] shadow-[0_0_0_1px_rgba(109,40,217,0.08)]',
    accent: '#6d28d9',
    soft: '#f5f3ff',
  },
  visa: {
    badge: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#c2410c]/25',
    pickerActive:
      'bg-[#fff7ed] ring-[#c2410c] shadow-[0_0_0_1px_rgba(194,65,12,0.08)]',
    accent: '#c2410c',
    soft: '#fff7ed',
  },
  'green-card': {
    badge: 'bg-[#fdf2f8] text-[#be185d] ring-[#f9a8d4]/60',
    picker: 'bg-white ring-black/[0.06] hover:ring-[#be185d]/25',
    pickerActive:
      'bg-[#fdf2f8] ring-[#be185d] shadow-[0_0_0_1px_rgba(190,24,93,0.08)]',
    accent: '#be185d',
    soft: '#fdf2f8',
  },
}

export const CPT_OPT_TIMELINE_FIELDS: {
  key: CptOptTimelineFieldKey
  rowClass: string
  labelClass: string
}[] = [
  {
    key: 'prepared',
    rowClass: 'border-l-[3px] border-[#60a5fa] bg-[#f8fbff]',
    labelClass: 'text-[#1d4ed8]',
  },
  {
    key: 'submitted',
    rowClass: 'border-l-[3px] border-[#fbbf24] bg-[#fffdf5]',
    labelClass: 'text-[#b45309]',
  },
  {
    key: 'resultReceived',
    rowClass: 'border-l-[3px] border-[#34d399] bg-[#f6fffb]',
    labelClass: 'text-[#047857]',
  },
  {
    key: 'nextStep',
    rowClass: 'border-l-[3px] border-[#a78bfa] bg-[#faf8ff]',
    labelClass: 'text-[#6d28d9]',
  },
]

/**
 * 단계 빠른 입력. 버튼 이름은 `reviews.cptOpt.quickSteps.<type>.<id>.label`,
 * 채워 넣는 값은 `reviews.cptOpt.quickSteps.<type>.<id>.<field>`.
 */
export const CPT_OPT_QUICK_STEPS: Record<
  CptOptTypeId,
  { id: string; fields: CptOptTimelineFieldKey[] }[]
> = {
  cpt: [
    { id: 'module', fields: ['prepared', 'nextStep'] },
    { id: 'offerLetter', fields: ['prepared', 'nextStep'] },
    { id: 'apply', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'newI20', fields: ['resultReceived', 'nextStep'] },
  ],
  opt: [
    { id: 'recommendation', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'i765', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'ead', fields: ['resultReceived', 'nextStep'] },
  ],
  'stem-opt': [
    { id: 'i983', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'approved', fields: ['resultReceived', 'nextStep'] },
  ],
  visa: [
    { id: 'interview', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'approved', fields: ['resultReceived', 'nextStep'] },
  ],
  'green-card': [
    { id: 'petition', fields: ['prepared', 'submitted', 'nextStep'] },
    { id: 'card', fields: ['resultReceived', 'nextStep'] },
  ],
}

export const CPT_OPT_TIMELINE_MAX = 8
export const CPT_OPT_FIELD_MAX = 280
export const CPT_OPT_STAGE_REVIEW_MAX = COMMUNITY_BODY_MAX
export const CPT_OPT_TIPS_MAX = 800

export function isCptOptTypeId(value: unknown): value is CptOptTypeId {
  return (
    value === 'cpt' ||
    value === 'opt' ||
    value === 'stem-opt' ||
    value === 'visa' ||
    value === 'green-card'
  )
}

export function normalizeCptOptType(
  raw: unknown,
  detailFallback?: string,
): CptOptTypeId | null {
  if (isCptOptTypeId(raw)) return raw
  const detail = String(detailFallback || '').trim().toLowerCase()
  if (detail === 'cpt') return 'cpt'
  if (detail === 'opt') return 'opt'
  if (detail.includes('stem')) return 'stem-opt'
  if (
    detail.includes('영주') ||
    detail.includes('green') ||
    detail.includes('eb-') ||
    detail.includes('eb2') ||
    detail.includes('eb3')
  ) {
    return 'green-card'
  }
  if (
    detail.includes('비자') ||
    detail.includes('visa') ||
    detail.includes('h-1b') ||
    detail.includes('h1b') ||
    detail.includes('f-1') ||
    detail.includes('o-1')
  ) {
    return 'visa'
  }
  return null
}

export const CPT_OPT_UPDATE_EPSILON_MS = 60_000

export function hasCptOptPostUpdate(post: {
  createdAt: number
  updatedAt: number
}) {
  return post.updatedAt - post.createdAt > CPT_OPT_UPDATE_EPSILON_MS
}

export function getCptOptListTimestamp(post: {
  createdAt: number
  updatedAt: number
}) {
  return post.updatedAt || post.createdAt
}

export function sortTimelineByDate(
  entries: CptOptTimelineEntry[],
): CptOptTimelineEntry[] {
  return [...entries].sort((a, b) => {
    const da = a.date.trim()
    const db = b.date.trim()
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
}

export function summarizeTimelineEntry(entry: CptOptTimelineEntry) {
  return [
    entry.prepared,
    entry.submitted,
    entry.resultReceived,
    entry.nextStep,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' · ')
}

export function getTimelineEntryPreview(entry: CptOptTimelineEntry) {
  const summary = summarizeTimelineEntry(entry)
  if (summary) return summary
  const plain = htmlToPlainText(entry.stageReviewHtml || '')
  if (!plain) return ''
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain
}

export function getLatestTimelineEntryId(
  entries: CptOptTimelineEntry[],
): string | null {
  const sorted = sortTimelineByDate(entries)
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const entry = sorted[index]
    if (getTimelineEntryPreview(entry)) return entry.id
  }
  return null
}

/** 저장용 유형 이름 (`detail` 컬럼). 화면 표시는 `t('reviews.cptOpt.types.<id>.label')` */
export function getCptOptTypeLabel(type: CptOptTypeId | null | undefined) {
  return CPT_OPT_TYPES.find((item) => item.id === type)?.label ?? ''
}

export function getCptOptTypeStyle(type: CptOptTypeId | null | undefined) {
  if (type && type in CPT_OPT_TYPE_STYLES) return CPT_OPT_TYPE_STYLES[type]
  return CPT_OPT_TYPE_STYLES.cpt
}

export function getCptOptTimelineDateRange(
  timeline: CptOptTimelineEntry[] | null | undefined,
  locale: Locale = 'ko',
) {
  const dates = (timeline ?? [])
    .map((entry) => entry.date.trim())
    .filter(Boolean)
    .sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatCptOptDate(dates[0], { compactYear: true, locale })
  return `${formatCptOptDate(dates[0], { compactYear: true, locale })} – ${formatCptOptDate(dates[dates.length - 1], { compactYear: true, locale })}`
}

export function normalizeCptOptTimeline(raw: unknown): CptOptTimelineEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Record<string, unknown>
      const date = String(data.date || '').trim()
      const prepared = String(data.prepared || '').trim()
      const submitted = String(data.submitted || '').trim()
      const resultReceived = String(data.resultReceived || '').trim()
      const nextStep = String(data.nextStep || '').trim()
      const stageReviewHtml = normalizeCptOptStageReviewHtml(
        data.stageReviewHtml,
      )
      if (
        !date &&
        !prepared &&
        !submitted &&
        !resultReceived &&
        !nextStep &&
        !stageReviewHtml
      ) {
        return null
      }
      return {
        id:
          String(data.id || '').trim() ||
          `step_${index}_${Math.random().toString(36).slice(2, 7)}`,
        date,
        prepared: prepared.slice(0, CPT_OPT_FIELD_MAX),
        submitted: submitted.slice(0, CPT_OPT_FIELD_MAX),
        resultReceived: resultReceived.slice(0, CPT_OPT_FIELD_MAX),
        nextStep: nextStep.slice(0, CPT_OPT_FIELD_MAX),
        stageReviewHtml,
      }
    })
    .filter((item): item is CptOptTimelineEntry => Boolean(item))
    .slice(0, CPT_OPT_TIMELINE_MAX)
}

function normalizeCptOptStageReviewHtml(raw: unknown) {
  const html = String(raw || '').trim()
  if (!html || !htmlToPlainText(html)) return ''
  return sanitizeCommunityHtml(html).slice(0, CPT_OPT_STAGE_REVIEW_MAX)
}

export function normalizeCptOptTips(raw: unknown) {
  return String(raw || '')
    .trim()
    .slice(0, CPT_OPT_TIPS_MAX)
}

export function formatCptOptDate(
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

export function createEmptyTimelineEntry(): CptOptTimelineEntry {
  return {
    id: `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    date: '',
    prepared: '',
    submitted: '',
    resultReceived: '',
    nextStep: '',
    stageReviewHtml: '',
  }
}

function hasStageReviewContent(entry: CptOptTimelineEntry) {
  return Boolean(htmlToPlainText(entry.stageReviewHtml || ''))
}

export function isTimelineEntryFilled(entry: CptOptTimelineEntry) {
  return Boolean(
    entry.date.trim() ||
      entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim() ||
      entry.nextStep.trim() ||
      hasStageReviewContent(entry),
  )
}

export function isTimelineEntryComplete(entry: CptOptTimelineEntry) {
  if (!entry.date.trim()) return false
  return Boolean(
    entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim() ||
      entry.nextStep.trim() ||
      hasStageReviewContent(entry),
  )
}
