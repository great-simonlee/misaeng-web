/**
 * 회사 업계·채용 시스템 코드와 라벨.
 * ellieo-erp src/app/util/companyConstants.mjs 와 코드를 맞춰 둔다.
 * 라벨은 i18n 키로 찾으므로 ellieo.com 등 다른 언어는 COMPANY_MESSAGES 에 추가하면 된다.
 */

/**
 * 기본 업계 목록. 실제 목록은 Supabase company_industries 표 (관리자 화면에서 편집)이고,
 * 이 목록과 라벨은 표가 없거나 읽기에 실패했을 때만 쓴다.
 */
export const COMPANY_INDUSTRIES = [
  'tech',
  'gaming',
  'telecom',
  'finance',
  'insurance',
  'accounting',
  'consulting',
  'law',
  'consumer',
  'fashion',
  'food',
  'hospitality',
  'media',
  'advertising',
  'healthcare',
  'pharma',
  'energy',
  'manufacturing',
  'automotive',
  'logistics',
  'trading',
  'real_estate',
  'architecture',
  'government',
  'nonprofit',
  'education',
  'other',
] as const

export type CompanyIndustry = (typeof COMPANY_INDUSTRIES)[number]

export const COMPANY_ATS_TYPES = ['greenhouse', 'lever', 'workday', 'other', 'unknown'] as const
export type CompanyAtsType = (typeof COMPANY_ATS_TYPES)[number]

export type CompanyLocale = 'ko' | 'en'

/** 비자 정보: null = 미확인 */
export const VISA_STATUSES = ['yes', 'no', 'case_by_case'] as const
export type VisaStatus = (typeof VISA_STATUSES)[number]

export function toVisaStatus(value: unknown): VisaStatus | null {
  return typeof value === 'string' && (VISA_STATUSES as readonly string[]).includes(value)
    ? (value as VisaStatus)
    : null
}

/** 비자 상태·국가 이름은 src/messages/<locale>/companies.json 의 visa.status.* · country.* 에 있다. */
export const visaStatusLabelKey = (status: string) => `visa.status.${status}`
export const countryLabelKey = (code: string) => `country.${code}`

export const industryLabelKey = (code: string) => `company.industry.${code}`
export const atsLabelKey = (code: string) => `company.ats.${code}`

export const COMPANY_MESSAGES: Record<CompanyLocale, Record<string, string>> = {
  ko: {
    'company.industry.tech': '테크',
    'company.industry.gaming': '게임',
    'company.industry.telecom': '통신',
    'company.industry.finance': '금융',
    'company.industry.insurance': '보험',
    'company.industry.accounting': '회계',
    'company.industry.consulting': '컨설팅',
    'company.industry.law': '법률',
    'company.industry.consumer': '소비재·리테일',
    'company.industry.fashion': '패션·뷰티',
    'company.industry.food': '식음료',
    'company.industry.hospitality': '호텔·여행',
    'company.industry.media': '미디어·엔터',
    'company.industry.advertising': '마케팅·광고',
    'company.industry.healthcare': '헬스케어',
    'company.industry.pharma': '제약·바이오',
    'company.industry.energy': '에너지',
    'company.industry.manufacturing': '제조',
    'company.industry.automotive': '자동차',
    'company.industry.logistics': '물류·운송',
    'company.industry.trading': '무역·상사',
    'company.industry.real_estate': '부동산',
    'company.industry.architecture': '건축·엔지니어링',
    'company.industry.government': '공공기관',
    'company.industry.nonprofit': '비영리',
    'company.industry.education': '교육',
    'company.industry.other': '기타',
    'company.ats.greenhouse': 'Greenhouse',
    'company.ats.lever': 'Lever',
    'company.ats.workday': 'Workday',
    'company.ats.other': '기타',
    'company.ats.unknown': '모름',
  },
  en: {
    'company.industry.tech': 'Tech',
    'company.industry.gaming': 'Gaming',
    'company.industry.telecom': 'Telecommunications',
    'company.industry.finance': 'Finance',
    'company.industry.insurance': 'Insurance',
    'company.industry.accounting': 'Accounting',
    'company.industry.consulting': 'Consulting',
    'company.industry.law': 'Legal',
    'company.industry.consumer': 'Consumer & Retail',
    'company.industry.fashion': 'Fashion & Beauty',
    'company.industry.food': 'Food & Beverage',
    'company.industry.hospitality': 'Hospitality & Travel',
    'company.industry.media': 'Media & Entertainment',
    'company.industry.advertising': 'Marketing & Advertising',
    'company.industry.healthcare': 'Healthcare',
    'company.industry.pharma': 'Pharma & Biotech',
    'company.industry.energy': 'Energy',
    'company.industry.manufacturing': 'Manufacturing',
    'company.industry.automotive': 'Automotive',
    'company.industry.logistics': 'Logistics & Transportation',
    'company.industry.trading': 'Trading',
    'company.industry.real_estate': 'Real Estate',
    'company.industry.architecture': 'Architecture & Engineering',
    'company.industry.government': 'Government',
    'company.industry.nonprofit': 'Nonprofit',
    'company.industry.education': 'Education',
    'company.industry.other': 'Other',
    'company.ats.greenhouse': 'Greenhouse',
    'company.ats.lever': 'Lever',
    'company.ats.workday': 'Workday',
    'company.ats.other': 'Other',
    'company.ats.unknown': 'Unknown',
  },
}

export function companyLabel(key: string, locale: CompanyLocale = 'ko'): string {
  return COMPANY_MESSAGES[locale]?.[key] ?? COMPANY_MESSAGES.en[key] ?? key
}

export const industryLabel = (code: string, locale?: CompanyLocale) =>
  companyLabel(industryLabelKey(code), locale)

export function isCompanyIndustry(value: unknown): value is CompanyIndustry {
  return typeof value === 'string' && (COMPANY_INDUSTRIES as readonly string[]).includes(value)
}

export const COMPANY_REVIEW_BOARD = 'job-review'
export const COMPANY_CLICK_KINDS = ['careers', 'students'] as const
export type CompanyClickKind = (typeof COMPANY_CLICK_KINDS)[number]
