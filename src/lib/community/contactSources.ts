import type { BrandId } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'

/**
 * 면접/취업 · 비자 글쓰기의 "어떤 경로로 연락받으셨나요?" 선택지.
 * 목록은 ellieo-erp(Contact Sources)가 storage `config/contact-sources.json`에 저장하고,
 * 옵션마다 미생/엘리오 중 어디에 보일지를 정한다. 저장된 게 없으면 DEFAULT_CONTACT_SOURCES.
 *
 * 글에는 예전 키 그대로 저장한다 (비공개, 앱 1.0.2·기존 글과 호환):
 * - 학생회 → jobReviewSource 'student-org' + jobReviewSourceOrgId <옵션 id>
 * - 그 외 → jobReviewSource <옵션 id>
 * - 예전 'kiso' → student-org + nyu-kiso
 */

export const CONTACT_SOURCE_KINDS = [
  'direct',
  'student-org',
  'partner',
  'referral',
  'other',
] as const

export type ContactSourceKind = (typeof CONTACT_SOURCE_KINDS)[number]

/** storage에 저장되는 옵션 (ERP에서 편집) */
export type ContactSourceConfigOption = {
  id: string
  kind: ContactSourceKind
  labels: Partial<Record<Locale, string>>
  brands: BrandId[]
  active: boolean
  /** 학생회: 외부 파트너 대시보드에서 묶을 학교 id */
  schoolId: string | null
  /** 학생회: 묶어 보여 줄 지역 (도시 id 또는 'other'). 글쓴이 도시 묶음이 먼저 */
  area: string | null
  /** ERP 알림 제목 등에 쓰는 짧은 영어 이름. 없으면 labels.en */
  shortName: string | null
}

/** 화면에 내려주는 옵션 (`GET /api/community/contact-sources`) */
export type ContactSourceOption = {
  id: string
  kind: ContactSourceKind
  label: string
  /** 글에 저장할 jobReviewSource / jobReviewSourceOrgId */
  source: string
  orgId: string | null
  /** 학생회: 지역 id와 화면 이름 (그 외 null) */
  area: string | null
  areaLabel: string | null
}

export type ContactSourceValue = { source: string; orgId: string | null }

const STUDENT_ORG_SOURCE = 'student-org'
const LEGACY_KISO = 'kiso'

type SeedOrg = [
  id: string,
  area: string,
  schoolId: string,
  shortName: string,
  en: string,
  ko: string,
  vi: string,
]

/** 학생회 기본 목록 (ERP에서 저장하기 전까지). 예전 STUDENT_ORG_GROUPS · partners.json 이름과 같다 */
const DEFAULT_STUDENT_ORGS: SeedOrg[] = [
  [
    'nyu-kiso',
    'nyc',
    'nyu',
    'NYU KISO',
    'NYU Korean Student Association',
    '뉴욕대 한인학생회',
    'Hội sinh viên Hàn Quốc NYU',
  ],
  [
    'fit-ksof',
    'nyc',
    'fit',
    'FIT KSOF',
    'FIT Korean Student Association',
    'FIT 한인학생회',
    'Hội sinh viên Hàn Quốc FIT',
  ],
  [
    'baruch-ksa',
    'nyc',
    'baruch',
    'Baruch KSA',
    'Baruch Korean Student Association',
    '버룩 한인학생회',
    'Hội sinh viên Hàn Quốc Baruch',
  ],
  [
    'parsons-ksa',
    'nyc',
    'parsons',
    'Parsons KISP',
    'Parsons Korean Student Association',
    '파슨스 한인학생회',
    'Hội sinh viên Hàn Quốc Parsons',
  ],
  [
    'rutgers-kisa',
    'nyc',
    'rutgers',
    'RUTGERS KISA',
    'Rutgers Korean Student Association',
    '럿거스 한인학생회',
    'Hội sinh viên Hàn Quốc Rutgers',
  ],
  [
    'yale-hanppuri',
    'nyc',
    'yale',
    'Yale Hanppuri',
    'Yale Hanppuri',
    '예일 한뿌리',
    'Hanppuri – Yale',
  ],
  [
    'neu-kisa',
    'boston',
    'northeastern',
    'NEU KISA',
    'Northeastern Korean Student Association',
    '노스이스턴 한인학생회',
    'Hội sinh viên Hàn Quốc Northeastern',
  ],
  [
    'bu-kisa',
    'boston',
    'bu',
    'BU KISA',
    'BU Korean Student Association',
    '보스턴대 한인학생회',
    'Hội sinh viên Hàn Quốc BU',
  ],
  [
    'bc-kisa',
    'boston',
    'bc',
    'BC KISA',
    'Boston College Korean Student Association',
    '보스턴칼리지 한인학생회',
    'Hội sinh viên Hàn Quốc Boston College',
  ],
  [
    'hc-kisa',
    'boston',
    'harvard',
    'HC KISA',
    'Harvard Korean Student Association',
    '하버드 한인학생회',
    'Hội sinh viên Hàn Quốc Harvard',
  ],
  [
    'berklee-kcsa',
    'boston',
    'berklee',
    'Berklee KCSA',
    'Berklee Korean Student Association',
    '버클리음대 한인학생회',
    'Hội sinh viên Hàn Quốc Berklee',
  ],
  [
    'tufts-kiso',
    'boston',
    'tufts',
    'Tufts KISO',
    'Tufts Korean Student Association',
    '터프츠 한인학생회',
    'Hội sinh viên Hàn Quốc Tufts',
  ],
  [
    'risd-ksa',
    'boston',
    'risd',
    'RISD KSA',
    'RISD Korean Student Association',
    'RISD 한인학생회',
    'Hội sinh viên Hàn Quốc RISD',
  ],
  [
    'brown-kisa',
    'boston',
    'brown',
    'Brown KISA',
    'Brown Korean Student Association',
    '브라운 한인학생회',
    'Hội sinh viên Hàn Quốc Brown',
  ],
  [
    'uw-ksu',
    'other',
    'uw',
    'UW KSU',
    'UW Korean Student Union',
    '워싱턴대 한인학생회',
    'Hội sinh viên Hàn Quốc UW',
  ],
]

function option(
  id: string,
  kind: ContactSourceKind,
  labels: Partial<Record<Locale, string>>,
  brands: BrandId[],
  shortName: string
): ContactSourceConfigOption {
  return { id, kind, labels, brands, active: true, schoolId: null, area: null, shortName }
}

export const DEFAULT_CONTACT_SOURCES: readonly ContactSourceConfigOption[] = [
  option('misaeng', 'direct', { en: 'Misaeng', ko: '미생', vi: 'Misaeng' }, ['misaeng'], 'Misaeng'),
  option('ellieo', 'direct', { en: 'Ellieo', ko: '엘리오', vi: 'Ellieo' }, ['ellieo'], 'Ellieo'),
  ...DEFAULT_STUDENT_ORGS.map(([id, area, schoolId, shortName, en, ko, vi]) => ({
    ...option(id, 'student-org', { en, ko, vi }, ['misaeng'], shortName),
    schoolId,
    area,
  })),
  option('givo', 'partner', { en: 'Givo', ko: 'Givo' }, ['misaeng'], 'GivO'),
  option(
    'referral',
    'referral',
    { en: 'Friend or acquaintance', ko: '지인 소개', vi: 'Bạn bè / người quen' },
    ['misaeng', 'ellieo'],
    'Personal Network'
  ),
  option(
    'other',
    'other',
    { en: 'Other', ko: '기타', vi: 'Khác' },
    ['misaeng', 'ellieo'],
    'Other Channels'
  ),
]

function isKind(value: unknown): value is ContactSourceKind {
  return CONTACT_SOURCE_KINDS.includes(value as ContactSourceKind)
}

function asTrimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/** storage JSON → 옵션 목록. 형식이 틀리면 null (기본 목록을 쓴다) */
export function normalizeContactSourceConfig(raw: unknown): ContactSourceConfigOption[] | null {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { options?: unknown }).options)
      ? (raw as { options: unknown[] }).options
      : null
  if (!list) return null
  const seen = new Set<string>()
  const options: ContactSourceConfigOption[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const data = item as Record<string, unknown>
    const id = asTrimmed(data.id)
    if (!id || id === STUDENT_ORG_SOURCE || id === LEGACY_KISO || seen.has(id)) continue
    if (!isKind(data.kind)) continue
    const labels: Partial<Record<Locale, string>> = {}
    if (data.labels && typeof data.labels === 'object') {
      for (const [key, value] of Object.entries(data.labels as Record<string, unknown>)) {
        const label = asTrimmed(value)
        if (label) labels[key as Locale] = label
      }
    }
    const brands = Array.isArray(data.brands)
      ? (data.brands.filter((brand) => brand === 'misaeng' || brand === 'ellieo') as BrandId[])
      : []
    seen.add(id)
    options.push({
      id,
      kind: data.kind,
      labels,
      brands,
      active: data.active !== false,
      schoolId: data.kind === 'student-org' ? asTrimmed(data.schoolId) || null : null,
      area: data.kind === 'student-org' ? asTrimmed(data.area) || 'other' : null,
      shortName: asTrimmed(data.shortName) || null,
    })
  }
  return options
}

export function contactSourceLabel(option: ContactSourceConfigOption, locale: Locale) {
  return option.labels[locale] || option.labels.en || option.id
}

export function contactSourceValue(
  option: Pick<ContactSourceConfigOption, 'id' | 'kind'>
): ContactSourceValue {
  return option.kind === 'student-org'
    ? { source: STUDENT_ORG_SOURCE, orgId: option.id }
    : { source: option.id, orgId: null }
}

/**
 * 이 브랜드 글쓰기에 보여 줄 옵션 (활성만). 종류 순 → 학생회는 지역별로 묶고 `city` 지역을 먼저 → ERP에서 정한 순서.
 * `areaLabel(area)`: 지역 화면 이름 (서버에서 번역)
 */
export function listContactSourceOptions(
  options: readonly ContactSourceConfigOption[],
  brand: BrandId,
  locale: Locale,
  { city, areaLabel }: { city?: string | null; areaLabel: (area: string) => string }
): ContactSourceOption[] {
  const visible = options.filter((option) => option.active && option.brands.includes(brand))
  const areaOrder: string[] = []
  for (const option of visible) {
    if (option.area && !areaOrder.includes(option.area)) areaOrder.push(option.area)
  }
  const areaRank = (area: string | null) =>
    area === null ? 0 : area === city ? -1 : areaOrder.indexOf(area)
  return visible
    .map((option, index) => ({ option, index }))
    .sort(
      (a, b) =>
        CONTACT_SOURCE_KINDS.indexOf(a.option.kind) - CONTACT_SOURCE_KINDS.indexOf(b.option.kind) ||
        areaRank(a.option.area) - areaRank(b.option.area) ||
        a.index - b.index
    )
    .map(({ option }) => ({
      id: option.id,
      kind: option.kind,
      label: contactSourceLabel(option, locale),
      ...contactSourceValue(option),
      area: option.area,
      areaLabel: option.area ? areaLabel(option.area) : null,
    }))
}

/** ERP 알림 제목 등에 쓰는 짧은 영어 이름 ("NYU KISO") */
export function contactSourceShortName(
  options: readonly ContactSourceConfigOption[],
  source: string,
  orgId: string | null
) {
  const value = normalizeStoredContactSource(source, orgId)
  const match = options.find((option) => {
    const expected = contactSourceValue(option)
    return expected.source === value.source && expected.orgId === value.orgId
  })
  if (match) return match.shortName || match.labels.en || match.id
  return value.source === STUDENT_ORG_SOURCE ? 'Student Organization' : 'Other Channels'
}

/** 저장된 값 정리 (검증 없이 예전 'kiso'만 바꾼다). 목록에서 빠진 옵션도 그대로 둔다 */
export function normalizeStoredContactSource(
  source: unknown,
  orgId: unknown
): { source: string | null; orgId: string | null } {
  const rawSource = asTrimmed(source)
  if (rawSource === LEGACY_KISO) return { source: STUDENT_ORG_SOURCE, orgId: 'nyu-kiso' }
  if (!rawSource) return { source: null, orgId: null }
  if (rawSource !== STUDENT_ORG_SOURCE) return { source: rawSource, orgId: null }
  return { source: rawSource, orgId: asTrimmed(orgId) || null }
}

/** 글쓰기 요청 검증: 이 브랜드의 옵션(비활성 포함 — 예전 글 수정)과 맞아야 한다 */
export function parseContactSourceInput(
  options: readonly ContactSourceConfigOption[],
  brand: BrandId,
  source: unknown,
  orgId: unknown
): ContactSourceValue | null {
  const value = normalizeStoredContactSource(source, orgId)
  if (!value.source) return null
  const match = options.find((option) => {
    if (!option.brands.includes(brand)) return false
    const expected = contactSourceValue(option)
    return expected.source === value.source && expected.orgId === value.orgId
  })
  return match ? contactSourceValue(match) : null
}

/** 화면: 저장된 (source, orgId)에 맞는 옵션 id */
export function findContactSourceOptionId(
  options: readonly ContactSourceOption[],
  source: string | null | undefined,
  orgId: string | null | undefined
) {
  const value = normalizeStoredContactSource(source, orgId)
  if (!value.source) return null
  return (
    options.find((option) => option.source === value.source && option.orgId === value.orgId)?.id ??
    null
  )
}
