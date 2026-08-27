import type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'

export type { CptOptTimelineEntry, CptOptTypeId } from '@/types/nyc'

export type CptOptTimelineFieldKey =
  | 'prepared'
  | 'submitted'
  | 'resultReceived'
  | 'nextStep'

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
  {
    id: 'visa',
    label: '비자',
    description: 'F-1 · H-1B · O-1 등',
    summary: '서류 준비, 인터뷰, 승인까지의 과정',
  },
  {
    id: 'green-card',
    label: '영주권',
    description: 'EB · 결혼 · 기타 경로',
    summary: '청원, 인터뷰, 승인·카드 수령 과정',
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
  label: string
  shortLabel: string
  hint: string
  rowClass: string
  labelClass: string
}[] = [
  {
    key: 'prepared',
    label: '뭘 준비했는지',
    shortLabel: '준비',
    hint: '그날까지 모은 서류·체크한 요건',
    rowClass: 'border-l-[3px] border-[#60a5fa] bg-[#f8fbff]',
    labelClass: 'text-[#1d4ed8]',
  },
  {
    key: 'submitted',
    label: '어떻게 제출했는지',
    shortLabel: '제출',
    hint: '어디에, 어떤 방식으로 올렸는지',
    rowClass: 'border-l-[3px] border-[#fbbf24] bg-[#fffdf5]',
    labelClass: 'text-[#b45309]',
  },
  {
    key: 'resultReceived',
    label: '결과를 어떻게 받았는지',
    shortLabel: '결과',
    hint: '이메일·우편·포털 등 수령 방법과 내용',
    rowClass: 'border-l-[3px] border-[#34d399] bg-[#f6fffb]',
    labelClass: 'text-[#047857]',
  },
  {
    key: 'nextStep',
    label: '다음 스텝은 뭔지',
    shortLabel: '다음 스텝',
    hint: '앞으로 해야 할 일·기다리는 일정',
    rowClass: 'border-l-[3px] border-[#a78bfa] bg-[#faf8ff]',
    labelClass: 'text-[#6d28d9]',
  },
]

const CPT_OPT_PLACEHOLDERS: Record<
  CptOptTypeId,
  Record<CptOptTimelineFieldKey, string>
> = {
  cpt: {
    prepared: '예: 오퍼레터, CPT 신청서, 어드바이저 서명',
    submitted: '예: ISS 포털에 PDF 업로드 후 확인 메일 발송',
    resultReceived: '예: 학교 이메일로 새 I-20 PDF 수령',
    nextStep: '예: I-20 출력·서명 후 근무 시작일 맞추기',
  },
  opt: {
    prepared: '예: I-765, 여권 사진, 졸업 증명서',
    submitted: '예: USCIS 온라인으로 I-765 제출·수수료 결제',
    resultReceived: '예: EAD 카드 우편 수령, 계정에서 승인 확인',
    nextStep: '예: EAD 유효기간·STEM 연장 요건 캘린더에 넣기',
  },
  'stem-opt': {
    prepared: '예: I-983, 회사 정보, DSO 연락',
    submitted: '예: STEM OPT 연장 신청서 제출, SEVP 업데이트',
    resultReceived: '예: I-797 승인 통지 이메일/우편 수령',
    nextStep: '예: 6·12·18개월 validation report 일정 잡기',
  },
  visa: {
    prepared: '예: DS-160, 재정 증빙, 면접 질문 정리',
    submitted: '예: 대사관 면접 예약·서류 제출',
    resultReceived: '예: 비자 승인 후 여권 수령',
    nextStep: '예: 입국·I-94 확인, SEVIS/학교 등록',
  },
  'green-card': {
    prepared: '예: I-140/I-485 서류, 의료검사, 변호사 미팅',
    submitted: '예: USCIS 청원 온라인/우편 제출, 인터뷰 출석',
    resultReceived: '예: 승인 통지 후 영주권 카드 우편 수령',
    nextStep: '예: 카드 수령 확인, 재입국·갱신 일정 체크',
  },
}

export const CPT_OPT_QUICK_STEPS: Record<
  CptOptTypeId,
  { label: string; patch: Partial<CptOptTimelineEntry> }[]
> = {
  cpt: [
    {
      label: '학교 신청',
      patch: {
        prepared: '오퍼레터, CPT 신청서',
        submitted: 'ISS 포털 업로드',
        nextStep: '새 I-20 수령 대기',
      },
    },
    {
      label: 'I-20 수령',
      patch: {
        resultReceived: '새 I-20 이메일 수령',
        nextStep: '서명 후 근무 시작',
      },
    },
  ],
  opt: [
    {
      label: 'I-765 제출',
      patch: {
        prepared: 'I-765, 사진, 수수료',
        submitted: 'USCIS 온라인 제출',
        nextStep: '케이스 상태 주기적으로 확인',
      },
    },
    {
      label: 'EAD 수령',
      patch: {
        resultReceived: 'EAD 카드 우편 수령',
        nextStep: '근무 시작·STEM 연장 요건 확인',
      },
    },
  ],
  'stem-opt': [
    {
      label: 'I-983 제출',
      patch: {
        prepared: 'I-983, 회사 정보',
        submitted: 'I-983 제출',
        nextStep: '승인·validation report 일정 확인',
      },
    },
    {
      label: '연장 승인',
      patch: {
        resultReceived: 'STEM OPT 연장 승인',
        nextStep: '보고 마감일 알림 설정',
      },
    },
  ],
  visa: [
    {
      label: '면접 예약',
      patch: {
        prepared: 'DS-160, 서류 묶음',
        submitted: '대사관 면접 예약',
        nextStep: '면접 준비·서류 최종 점검',
      },
    },
    {
      label: '비자 승인',
      patch: {
        resultReceived: '비자 승인·여권 수령',
        nextStep: '입국·학교/회사 등록',
      },
    },
  ],
  'green-card': [
    {
      label: '청원 제출',
      patch: {
        prepared: '청원 서류 패키지',
        submitted: 'USCIS 청원 제출',
        nextStep: '영수증·인터뷰 일정 대기',
      },
    },
    {
      label: '카드 수령',
      patch: {
        resultReceived: '영주권 카드 수령',
        nextStep: '갱신·재입국 서류 확인',
      },
    },
  ],
}

export const CPT_OPT_TIMELINE_MAX = 20
export const CPT_OPT_FIELD_MAX = 280
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
      const nextStep = String(data.nextStep || '').trim()
      if (
        !date &&
        !prepared &&
        !submitted &&
        !resultReceived &&
        !nextStep
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
    nextStep: '',
  }
}

export function isTimelineEntryFilled(entry: CptOptTimelineEntry) {
  return Boolean(
    entry.date.trim() ||
      entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim() ||
      entry.nextStep.trim(),
  )
}

export function isTimelineEntryComplete(entry: CptOptTimelineEntry) {
  if (!entry.date.trim()) return false
  return Boolean(
    entry.prepared.trim() ||
      entry.submitted.trim() ||
      entry.resultReceived.trim() ||
      entry.nextStep.trim(),
  )
}
