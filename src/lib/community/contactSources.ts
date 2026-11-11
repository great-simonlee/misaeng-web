import type { BrandId } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'

/**
 * 면접/취업 · 비자 글쓰기의 "어떤 경로로 연락받으셨나요?".
 * ellieo-erp(Team Directory › Contact sources)가 storage `config/contact-sources.json`에 저장한다:
 * - categories — 글쓰기의 줄 ("학생회를 통해", "Givo를 통해", "지인 소개" …): 이름 · 줄 제목 · 설명(언어별) · 아이콘 · 브랜드
 * - organizations — 카테고리 안의 선택지 (NYU KISO, Givo New York …). 조직이 있는 카테고리는 열어서 하나를 고르고,
 *   없는 카테고리는 그 자체가 선택지. 조직은 지역(도시 id)으로 묶여 보인다 (글쓴이 도시 먼저)
 * - options — 카테고리 이전의 평평한 목록 (ERP가 저장할 때 같이 쓴다. 이 파일은 카테고리가 없으면 그걸 읽는다)
 * 저장된 게 없으면 DEFAULT_CONTACT_SOURCES. ERP util misaengJobReviewSource.js와 같은 규칙.
 *
 * 글에는 예전 키 그대로 저장한다 (비공개):
 * - jobReviewSource = 카테고리 id, jobReviewSourceOrgId = 조직 id (조직 없는 카테고리는 null)
 *   예전 글과 같은 모양: student-org + nyu-kiso, givo + givo-nyc, misaeng + null
 * - 예전 'kiso' → student-org + nyu-kiso. 예전 앱은 조직 id를 source로 보낸다 → 그 조직의 카테고리 + 조직
 * - 조직이 있는 카테고리를 조직 없이 (Givo 지점 생기기 전 글) → 첫 조직 (학생회는 제외)
 */

export type ContactSourceText = Partial<Record<Locale, string>>

export const CONTACT_SOURCE_ICONS = [
  'letter',
  'school',
  'people',
  'building',
  'briefcase',
  'globe',
  'heart',
  'star',
  'more',
] as const
export type ContactSourceIcon = (typeof CONTACT_SOURCE_ICONS)[number]

export type ContactSourceCategory = {
  id: string
  names: ContactSourceText
  titles: ContactSourceText
  descriptions: ContactSourceText
  icon: ContactSourceIcon
  brands: BrandId[]
  active: boolean
  /** ERP 알림 제목 등에 쓰는 짧은 영어 이름. 없으면 names.en */
  shortName: string | null
}

export type ContactSourceOrganization = {
  id: string
  categoryId: string
  labels: ContactSourceText
  active: boolean
  /** 외부 파트너 대시보드에서 묶을 학교 id */
  schoolId: string | null
  /** 묶어 보여 줄 지역 (도시 id 또는 'other') */
  area: string | null
  shortName: string | null
}

export type ContactSourceConfig = {
  categories: ContactSourceCategory[]
  organizations: ContactSourceOrganization[]
}

/** 화면에 내려주는 카테고리 (`GET /api/community/contact-sources?v=2`) */
export type ContactSourceCategoryView = {
  id: string
  title: string
  description: string
  icon: ContactSourceIcon
  /** icon이 'letter'일 때 보여 줄 글자 */
  letter: string
  /** 조직 (지역 순: 글쓴이 도시 먼저). 비어 있으면 카테고리 자체가 선택지 */
  options: ContactSourceOrganizationView[]
}

export type ContactSourceOrganizationView = {
  id: string
  label: string
  area: string | null
  areaLabel: string | null
}

/** 예전 앱용 평평한 선택지 (`?v=2` 없는 요청) */
export type LegacyContactSourceOption = {
  id: string
  kind: 'direct' | 'student-org' | 'partner' | 'referral' | 'other'
  label: string
  source: string
  orgId: string | null
  area: string | null
  areaLabel: string | null
}

export type ContactSourceValue = { source: string; orgId: string | null }

export const STUDENT_ORG_CATEGORY = 'student-org'
const LEGACY_KISO = 'kiso'

type SeedOrg = [id: string, area: string, schoolId: string, shortName: string, en: string, ko: string, vi: string]

/** 학생회 기본 목록 (ERP에서 저장하기 전까지) */
const DEFAULT_STUDENT_ORGS: SeedOrg[] = [
  ['nyu-kiso', 'nyc', 'nyu', 'NYU KISO', 'NYU Korean Student Association', '뉴욕대 한인학생회', 'Hội sinh viên Hàn Quốc NYU'],
  ['fit-ksof', 'nyc', 'fit', 'FIT KSOF', 'FIT Korean Student Association', 'FIT 한인학생회', 'Hội sinh viên Hàn Quốc FIT'],
  ['baruch-ksa', 'nyc', 'baruch', 'Baruch KSA', 'Baruch Korean Student Association', '버룩 한인학생회', 'Hội sinh viên Hàn Quốc Baruch'],
  ['parsons-ksa', 'nyc', 'parsons', 'Parsons KISP', 'Parsons Korean Student Association', '파슨스 한인학생회', 'Hội sinh viên Hàn Quốc Parsons'],
  ['rutgers-kisa', 'nyc', 'rutgers', 'Rutgers KISA', 'Rutgers Korean Student Association', '럿거스 한인학생회', 'Hội sinh viên Hàn Quốc Rutgers'],
  ['yale-hanppuri', 'nyc', 'yale', 'Yale Hanppuri', 'Yale Hanppuri', '예일 한뿌리', 'Hanppuri – Yale'],
  ['neu-kisa', 'boston', 'northeastern', 'NEU KISA', 'Northeastern Korean Student Association', '노스이스턴 한인학생회', 'Hội sinh viên Hàn Quốc Northeastern'],
  ['bu-kisa', 'boston', 'bu', 'BU KISA', 'BU Korean Student Association', '보스턴대 한인학생회', 'Hội sinh viên Hàn Quốc BU'],
  ['bc-kisa', 'boston', 'bc', 'BC KISA', 'Boston College Korean Student Association', '보스턴칼리지 한인학생회', 'Hội sinh viên Hàn Quốc Boston College'],
  ['hc-kisa', 'boston', 'harvard', 'HC KISA', 'Harvard Korean Student Association', '하버드 한인학생회', 'Hội sinh viên Hàn Quốc Harvard'],
  ['berklee-kcsa', 'boston', 'berklee', 'Berklee KCSA', 'Berklee Korean Student Association', '버클리음대 한인학생회', 'Hội sinh viên Hàn Quốc Berklee'],
  ['tufts-kiso', 'boston', 'tufts', 'Tufts KISO', 'Tufts Korean Student Association', '터프츠 한인학생회', 'Hội sinh viên Hàn Quốc Tufts'],
  ['risd-ksa', 'boston', 'risd', 'RISD KSA', 'RISD Korean Student Association', 'RISD 한인학생회', 'Hội sinh viên Hàn Quốc RISD'],
  ['brown-kisa', 'boston', 'brown', 'Brown KISA', 'Brown Korean Student Association', '브라운 한인학생회', 'Hội sinh viên Hàn Quốc Brown'],
  ['uw-ksu', 'other', 'uw', 'UW KSU', 'UW Korean Student Union', '워싱턴대 한인학생회', 'Hội sinh viên Hàn Quốc UW'],
]

function category(
  id: string,
  names: ContactSourceText,
  titles: ContactSourceText,
  descriptions: ContactSourceText,
  icon: ContactSourceIcon,
  brands: BrandId[],
  shortName: string
): ContactSourceCategory {
  return { id, names, titles, descriptions, icon, brands, active: true, shortName }
}

/** ERP 기본값과 같다 (misaengJobReviewSource.js DEFAULT_CONTACT_SOURCES) */
export const DEFAULT_CONTACT_SOURCES: ContactSourceConfig = {
  categories: [
    category(
      'misaeng',
      { en: 'Misaeng', ko: '미생', vi: 'Misaeng' },
      { en: 'Through Misaeng', ko: '미생을 통해', vi: 'Qua Misaeng' },
      { en: 'Misaeng reached out to me', ko: '미생에서 연락을 받았어요', vi: 'Misaeng đã liên hệ với tôi' },
      'letter',
      ['misaeng'],
      'Misaeng'
    ),
    category(
      'ellieo',
      { en: 'Ellieo', ko: '엘리오', vi: 'Ellieo' },
      { en: 'Through Ellieo', ko: '엘리오를 통해', vi: 'Qua Ellieo' },
      { en: 'Ellieo reached out to me', ko: '엘리오에서 연락을 받았어요', vi: 'Ellieo đã liên hệ với tôi' },
      'letter',
      ['ellieo'],
      'Ellieo'
    ),
    category(
      STUDENT_ORG_CATEGORY,
      { en: 'Student organization', ko: '학생회', vi: 'Hội sinh viên' },
      { en: 'Through a student organization', ko: '학생회를 통해', vi: 'Qua hội sinh viên' },
      {
        en: "My school's student organization reached out",
        ko: '학교 학생회에서 연락을 받았어요',
        vi: 'Hội sinh viên của trường đã liên hệ với tôi',
      },
      'school',
      ['misaeng'],
      'Student Organization'
    ),
    category(
      'givo',
      { en: 'Givo', ko: 'Givo' },
      { en: 'Through Givo', ko: 'Givo를 통해', vi: 'Qua Givo' },
      { en: 'Givo reached out to me', ko: 'Givo에서 연락을 받았어요', vi: 'Givo đã liên hệ với tôi' },
      'letter',
      ['misaeng'],
      'GivO'
    ),
    category(
      'referral',
      { en: 'Friend or acquaintance', ko: '지인 소개', vi: 'Bạn bè / người quen' },
      { en: 'Friend or acquaintance', ko: '지인 소개', vi: 'Bạn bè / người quen' },
      { en: 'Someone I know introduced me', ko: '아는 사람에게 소개받았어요', vi: 'Người quen giới thiệu' },
      'people',
      ['misaeng', 'ellieo'],
      'Personal Network'
    ),
    category(
      'other',
      { en: 'Other', ko: '기타', vi: 'Khác' },
      { en: 'Other', ko: '기타', vi: 'Khác' },
      { en: 'Some other way', ko: '그 외 다른 경로', vi: 'Cách khác' },
      'more',
      ['misaeng', 'ellieo'],
      'Other Channels'
    ),
  ],
  organizations: [
    ...DEFAULT_STUDENT_ORGS.map(([id, area, schoolId, shortName, en, ko, vi]) => ({
      id,
      categoryId: STUDENT_ORG_CATEGORY,
      labels: { en, ko, vi },
      active: true,
      schoolId,
      area,
      shortName,
    })),
    {
      id: 'givo-nyc',
      categoryId: 'givo',
      labels: { en: 'Givo New York', ko: 'Givo New York' },
      active: true,
      schoolId: null,
      area: null,
      shortName: 'GivO New York',
    },
    {
      id: 'givo-boston',
      categoryId: 'givo',
      labels: { en: 'Givo Boston', ko: 'Givo Boston' },
      active: true,
      schoolId: null,
      area: null,
      shortName: 'GivO Boston',
    },
  ],
}

/* ───────────────────────── normalizing ───────────────────────── */

function asTrimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function text(value: unknown): ContactSourceText {
  const out: ContactSourceText = {}
  for (const [key, raw] of Object.entries(asRecord(value) ?? {})) {
    const label = asTrimmed(raw)
    if (label) out[key as Locale] = label
  }
  return out
}

function brands(value: unknown): BrandId[] {
  return Array.isArray(value)
    ? (value.filter((brand) => brand === 'misaeng' || brand === 'ellieo') as BrandId[])
    : []
}

function isIcon(value: unknown): value is ContactSourceIcon {
  return CONTACT_SOURCE_ICONS.includes(value as ContactSourceIcon)
}

/** 카테고리 이전 목록 (`options`, kind + parentId) → 카테고리 + 조직 (ERP fromLegacyOptions와 같다) */
function fromLegacyOptions(list: unknown[]): { categories: unknown[]; organizations: unknown[] } {
  const seed = (id: string) => DEFAULT_CONTACT_SOURCES.categories.find((item) => item.id === id)
  const categories: Record<string, unknown>[] = []
  const organizations: Record<string, unknown>[] = []
  for (const raw of list) {
    const option = asRecord(raw)
    const id = asTrimmed(option?.id).toLowerCase()
    if (!option || !id) continue
    if (option.kind === 'student-org' || asTrimmed(option.parentId)) {
      const categoryId =
        option.kind === 'student-org' ? STUDENT_ORG_CATEGORY : asTrimmed(option.parentId).toLowerCase()
      if (!categories.some((item) => item.id === categoryId)) {
        categories.push(seed(categoryId) ?? { id: categoryId, names: { en: categoryId }, brands: option.brands })
      }
      organizations.push({ ...option, id, categoryId })
      continue
    }
    if (categories.some((item) => item.id === id)) continue
    const base = seed(id)
    categories.push({
      ...(base ?? {}),
      id,
      names: option.labels ?? base?.names,
      brands: option.brands,
      active: option.active,
      shortName: option.shortName ?? base?.shortName,
      icon: base?.icon ?? (option.kind === 'referral' ? 'people' : option.kind === 'other' ? 'more' : 'letter'),
    })
  }
  // 조직이 없던 카테고리에 기본 조직 (Givo New York / Boston): ERP에서 저장하기 전에도 나뉘어 보인다
  for (const org of DEFAULT_CONTACT_SOURCES.organizations) {
    if (org.categoryId === STUDENT_ORG_CATEGORY) continue
    if (!categories.some((item) => item.id === org.categoryId)) continue
    if (organizations.some((item) => item.categoryId === org.categoryId || item.id === org.id)) continue
    organizations.push(...DEFAULT_CONTACT_SOURCES.organizations.filter((item) => item.categoryId === org.categoryId))
  }
  return { categories, organizations }
}

/** storage JSON → 설정. 형식이 틀리면 null (기본값을 쓴다) */
export function normalizeContactSourceConfig(raw: unknown): ContactSourceConfig | null {
  const data = asRecord(raw)
  const input = Array.isArray(raw)
    ? fromLegacyOptions(raw)
    : data && Array.isArray(data.categories)
      ? { categories: data.categories as unknown[], organizations: (data.organizations as unknown[]) ?? [] }
      : data && Array.isArray(data.options)
        ? fromLegacyOptions(data.options as unknown[])
        : null
  if (!input) return null
  const categories: ContactSourceCategory[] = []
  for (const raw of input.categories) {
    const item = asRecord(raw)
    const id = asTrimmed(item?.id).toLowerCase()
    const names = text(item?.names)
    if (!item || !id || id === LEGACY_KISO || !names.en || categories.some((other) => other.id === id)) continue
    categories.push({
      id,
      names,
      titles: text(item.titles),
      descriptions: text(item.descriptions),
      icon: isIcon(item.icon) ? item.icon : 'letter',
      brands: brands(item.brands),
      active: item.active !== false,
      shortName: asTrimmed(item.shortName) || null,
    })
  }
  if (categories.length === 0) return null
  const seen = new Set(categories.map((item) => item.id))
  const organizations: ContactSourceOrganization[] = []
  for (const raw of Array.isArray(input.organizations) ? input.organizations : []) {
    const item = asRecord(raw)
    const id = asTrimmed(item?.id).toLowerCase()
    const categoryId = asTrimmed(item?.categoryId).toLowerCase()
    const labels = text(item?.labels)
    if (!item || !id || seen.has(id) || !labels.en || !categories.some((cat) => cat.id === categoryId)) continue
    seen.add(id)
    organizations.push({
      id,
      categoryId,
      labels,
      active: item.active !== false,
      schoolId: asTrimmed(item.schoolId) || null,
      area: asTrimmed(item.area) || null,
      shortName: asTrimmed(item.shortName) || null,
    })
  }
  return { categories, organizations }
}

/* ───────────────────────── reading ───────────────────────── */

function pick(map: ContactSourceText, locale: Locale) {
  return map[locale] || map.en || ''
}

export function categoryName(cat: ContactSourceCategory, locale: Locale) {
  return pick(cat.names, locale) || cat.id
}

function organizationsOf(config: ContactSourceConfig, categoryId: string) {
  return config.organizations.filter((org) => org.categoryId === categoryId)
}

/** 조직을 지역별로 (글쓴이 도시 먼저, 그다음 ERP에서 처음 나온 순서), 지역 안에서는 ERP 순서 */
function sortByArea<T extends { area: string | null }>(orgs: T[], city: string | null | undefined) {
  const order: string[] = []
  for (const org of orgs) if (org.area && !order.includes(org.area)) order.push(org.area)
  const rank = (area: string | null) => (area === null ? order.length : area === city ? -1 : order.indexOf(area))
  return orgs
    .map((org, index) => ({ org, index }))
    .sort((a, b) => rank(a.org.area) - rank(b.org.area) || a.index - b.index)
    .map(({ org }) => org)
}

type ListOptions = { city?: string | null; areaLabel: (area: string) => string }

/** 이 브랜드 글쓰기의 카테고리 (활성만, ERP 순서). 조직이 모두 꺼진 카테고리는 뺀다 */
export function listContactSourceCategories(
  config: ContactSourceConfig,
  brand: BrandId,
  locale: Locale,
  { city, areaLabel }: ListOptions
): ContactSourceCategoryView[] {
  const out: ContactSourceCategoryView[] = []
  for (const cat of config.categories) {
    if (!cat.active || !cat.brands.includes(brand)) continue
    const all = organizationsOf(config, cat.id)
    const orgs = all.filter((org) => org.active)
    if (all.length > 0 && orgs.length === 0) continue
    const name = categoryName(cat, locale)
    out.push({
      id: cat.id,
      title: pick(cat.titles, locale) || name,
      description: pick(cat.descriptions, locale),
      icon: cat.icon,
      // 영어 이름 첫 글자 (예전 앱처럼 미생 → M)
      letter: Array.from(categoryName(cat, 'en'))[0]?.toUpperCase() ?? '',
      options: sortByArea(orgs, city).map((org) => ({
        id: org.id,
        // 학생회처럼 짧은 이름이 있으면 칩에는 그것 (한글 정식 이름은 칩에 길다)
        label: cat.id === STUDENT_ORG_CATEGORY && org.shortName ? org.shortName : pick(org.labels, locale) || org.id,
        area: org.area,
        areaLabel: org.area ? areaLabel(org.area) : null,
      })),
    })
  }
  return out
}

/**
 * 예전 앱(카테고리를 모르는 1.0.3 이하)용 평평한 목록: 학생회는 학생회 칩들(kind student-org),
 * 조직 없는 카테고리는 한 줄, 그 밖의 조직은 조직마다 한 줄 (source = 조직 id → 저장할 때 카테고리 + 조직으로 바뀐다)
 */
export function listContactSourceOptions(
  config: ContactSourceConfig,
  brand: BrandId,
  locale: Locale,
  options: ListOptions
): LegacyContactSourceOption[] {
  const legacyKind = (id: string): LegacyContactSourceOption['kind'] =>
    id === 'misaeng' || id === 'ellieo' ? 'direct' : id === 'referral' || id === 'other' ? id : 'partner'
  const out: LegacyContactSourceOption[] = []
  for (const cat of listContactSourceCategories(config, brand, locale, options)) {
    const stored = config.categories.find((item) => item.id === cat.id)!
    if (cat.options.length === 0) {
      out.push({
        id: cat.id,
        kind: legacyKind(cat.id),
        label: categoryName(stored, locale),
        source: cat.id,
        orgId: null,
        area: null,
        areaLabel: null,
      })
      continue
    }
    for (const org of cat.options) {
      const student = cat.id === STUDENT_ORG_CATEGORY
      out.push({
        id: org.id,
        kind: student ? 'student-org' : 'partner',
        label: org.label,
        source: student ? STUDENT_ORG_CATEGORY : org.id,
        orgId: student ? org.id : null,
        area: student ? org.area ?? 'other' : null,
        areaLabel: student ? org.areaLabel : null,
      })
    }
  }
  return out
}

/** ERP 알림 제목 등에 쓰는 짧은 영어 이름 ("NYU KISO", "GivO Boston") */
export function contactSourceShortName(config: ContactSourceConfig, source: string, orgId: string | null) {
  const value = resolveContactSource(config, source, orgId)
  if (value?.orgId) {
    const org = config.organizations.find((item) => item.id === value.orgId)!
    return org.shortName || org.labels.en || org.id
  }
  const cat = value && config.categories.find((item) => item.id === value.source)
  if (cat) return cat.shortName || cat.names.en || cat.id
  return source === STUDENT_ORG_CATEGORY ? 'Student Organization' : 'Other Channels'
}

/** 저장된 값 정리 (검증 없이 예전 'kiso'만 바꾼다). 목록에서 빠진 값도 그대로 둔다 */
export function normalizeStoredContactSource(
  source: unknown,
  orgId: unknown
): { source: string | null; orgId: string | null } {
  const rawSource = asTrimmed(source)
  if (rawSource === LEGACY_KISO) return { source: STUDENT_ORG_CATEGORY, orgId: 'nyu-kiso' }
  if (!rawSource) return { source: null, orgId: null }
  return { source: rawSource, orgId: asTrimmed(orgId) || null }
}

/**
 * (source, orgId) → 저장할 값, 설정에 없으면 null (비활성 포함 — 예전 글 수정).
 * 조직 id가 source면 그 카테고리 + 조직. 조직이 있는 카테고리에 조직이 없거나 모르는 조직이면 첫 조직 (학생회는 null)
 */
function resolveContactSource(config: ContactSourceConfig, source: unknown, orgId: unknown): ContactSourceValue | null {
  const value = normalizeStoredContactSource(source, orgId)
  if (!value.source) return null
  const asOrg = config.organizations.find((org) => org.id === value.source)
  if (asOrg) return { source: asOrg.categoryId, orgId: asOrg.id }
  const cat = config.categories.find((item) => item.id === value.source)
  if (!cat) return null
  const orgs = organizationsOf(config, cat.id)
  if (orgs.length === 0) return { source: cat.id, orgId: null }
  const org = orgs.find((item) => item.id === value.orgId)
  if (org) return { source: cat.id, orgId: org.id }
  return cat.id === STUDENT_ORG_CATEGORY ? null : { source: cat.id, orgId: orgs[0].id }
}

/** 글쓰기 요청 검증: 이 브랜드의 카테고리(비활성 포함)와 맞아야 한다 */
export function parseContactSourceInput(
  config: ContactSourceConfig,
  brand: BrandId,
  source: unknown,
  orgId: unknown
): ContactSourceValue | null {
  const value = resolveContactSource(config, source, orgId)
  if (!value) return null
  const cat = config.categories.find((item) => item.id === value.source)
  return cat?.brands.includes(brand) ? value : null
}

/** 연락 경로를 다 골랐는지 (조직이 있는 카테고리는 picker가 조직을 고른 뒤에야 값을 넣는다) */
export function isContactSourceComplete(source: string | null | undefined, orgId: string | null | undefined) {
  return Boolean(source) && (source !== STUDENT_ORG_CATEGORY || Boolean(orgId))
}
