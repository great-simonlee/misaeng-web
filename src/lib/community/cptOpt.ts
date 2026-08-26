import type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'

export type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'

export type CptOptTimelineFieldKey = 'prepared' | 'submitted' | 'resultReceived'

export const CPT_OPT_TYPES: {
  id: CptOptTypeId
  label: string
  description: string
  summary: string
}[] = [
  {
    id: 'cpt',
    label: 'CPT',
    description: '재학 중 인턴·취업 허가',
    summary: '학교 ISS에 신청하고 I-20을 받는 과정',
  },
  {
    id: 'opt',
    label: 'OPT',
    description: '졸업 후 1년 취업 허가',
    summary: 'USCIS I-765 제출 후 EAD 카드 수령',
  },
  {
    id: 'stem-opt',
    label: 'STEM OPT',
    description: 'STEM 전공 OPT 24개월 연장',
    summary: 'I-983 작성·제출과 SEVP 검증 보고',
  },
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
}

export const CPT_OPT_TIMELINE_FIELDS: {
  key: CptOptTimelineFieldKey
  label: string
  shortLabel: string
  hint: string
  rowClass: string
  labelClass: string
}[] = [
  {
    key: 'prepared',
    label: '준비한 것',
    shortLabel: '준비',
    hint: '그날까지 모은 서류·정리한 내용',
    rowClass: 'border-l-[3px] border-[#60a5fa] bg-[#f8fbff]',
    labelClass: 'text-[#1d4ed8]',
  },
  {
    key: 'submitted',
    label: '제출한 것',
    shortLabel: '제출',
    hint: '학교·USCIS·SEVP 등에 올린 것',
    rowClass: 'border-l-[3px] border-[#fbbf24] bg-[#fffdf5]',
    labelClass: 'text-[#b45309]',
  },
  {
    key: 'resultReceived',
    label: '결과 수령',
    shortLabel: '결과',
    hint: '승인·카드·I-20 등 받은 시점',
    rowClass: 'border-l-[3px] border-[#34d399] bg-[#f6fffb]',
    labelClass: 'text-[#047857]',
  },
]

const CPT_OPT_PLACEHOLDERS: Record<
  CptOptTypeId,
  Record<CptOptTimelineFieldKey, string>
> = {
  cpt: {
    prepared: '예: 오퍼레터, CPT 신청서, 어드바이저 서명',
    submitted: '예: ISS 포털 업로드, 학교 이메일 제출',
    resultReceived: '예: 새 I-20 PDF 이메일 수령',
  },
  opt: {
    prepared: '예: I-765, 여권 사진, 졸업 증명서',
    submitted: '예: USCIS 온라인 I-765 제출',
    resultReceived: '예: EAD 카드 우편 수령, 승인 통지',
  },
  'stem-opt': {
    prepared: '예: I-983, 회사 정보, 학교 DSO 연락',
    submitted: '예: STEM OPT 연장 신청, SEVP 포털 업데이트',
    resultReceived: '예: I-797 승인, 연장된 EAD 수령',
  },
}

export const CPT_OPT_QUICK_STEPS: Record<
  CptOptTypeId,
  { label: string; patch: Partial<CptOptTimelineEntry> }[]
> = {
  cpt: [
    { label: '학교 신청', patch: { prepared: '오퍼레터, CPT 신청서' } },
    { label: 'I-20 수령', patch: { resultReceived: '새 I-20 수령' } },
  ],
  opt: [
    { label: 'I-765 제출', patch: { submitted: 'USCIS I-765 제출' } },
    { label: 'EAD 수령', patch: { resultReceived: 'EAD 카드 수령' } },
  ],
  'stem-opt': [
    { label: 'I-983 제출', patch: { submitted: 'I-983 제출' } },
    { label: '연장 승인', patch: { resultReceived: 'STEM OPT 연장 승인' } },
  ],
}

export const CPT_OPT_TIMELINE_MAX = 20
export const CPT_OPT_FIELD_MAX = 280
export const CPT_OPT_TIPS_MAX = 800

export function isCptOptTypeId(value: unknown): value is CptOptTypeId {
  return value === 'cpt' || value === 'opt' || value === 'stem-opt'
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
  return [entry.prepared, entry.submitted, entry.resultReceived]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' · ')
}

export function getLatestTimelineEntryId(
  entries: CptOptTimelineEntry[],
): string | null {
  const sorted = sortTimelineByDate(entries)
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const entry = sorted[index]
    if (summarizeTimelineEntry(entry)) return entry.id
  }
  return null
}

export function getCptOptTypeLabel(type: CptOptTypeId | null | undefined) {
  return CPT_OPT_TYPES.find((item) => item.id === type)?.label ?? ''
}

export function getCptOptTypeStyle(type: CptOptTypeId | null | undefined) {
  if (type && type in CPT_OPT_TYPE_STYLES) return CPT_OPT_TYPE_STYLES[type]
  return CPT_OPT_TYPE_STYLES.cpt
}

export function getCptOptTimelinePlaceholder(
  type: CptOptTypeId | null | undefined,
  field: CptOptTimelineFieldKey,
) {
  if (type) return CPT_OPT_PLACEHOLDERS[type][field]
  return CPT_OPT_PLACEHOLDERS.cpt[field]
}

export function getCptOptTimelineDateRange(
  timeline: CptOptTimelineEntry[] | null | undefined,
) {
  const dates = (timeline ?? [])
    .map((entry) => entry.date.trim())
    .filter(Boolean)
    .sort()
  if (dates.length === 0) return null
  if (dates.length === 1) return formatCptOptDate(dates[0])
  return `${formatCptOptDate(dates[0])} – ${formatCptOptDate(dates[dates.length - 1])}`
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
      if (!date && !prepared && !submitted && !resultReceived) return null
      return {
        id:
          String(data.id || '').trim() ||
          `step_${index}_${Math.random().toString(36).slice(2, 7)}`,
        date,
        prepared: prepared.slice(0, CPT_OPT_FIELD_MAX),
        submitted: submitted.slice(0, CPT_OPT_FIELD_MAX),
        resultReceived: resultReceived.slice(0, CPT_OPT_FIELD_MAX),
      }
    })
    .filter((item): item is CptOptTimelineEntry => Boolean(item))
    .slice(0, CPT_OPT_TIMELINE_MAX)
}

export function normalizeCptOptTips(raw: unknown) {
  return String(raw || '')
    .trim()
    .slice(0, CPT_OPT_TIPS_MAX)
}

export function formatCptOptDate(value: string) {
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

export function createEmptyTimelineEntry(): CptOptTimelineEntry {
  return {
    id: `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    date: '',
    prepared: '',
    submitted: '',
    resultReceived: '',
  }
}

export function isTimelineEntryFilled(entry: CptOptTimelineEntry) {
  return Boolean(
    entry.date.trim() ||
      entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim(),
  )
}

export function isTimelineEntryComplete(entry: CptOptTimelineEntry) {
  if (!entry.date.trim()) return false
  return Boolean(
    entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim(),
  )
}
