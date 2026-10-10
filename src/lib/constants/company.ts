/**
 * 회사 업계·채용 시스템 코드와 라벨.
 * ellieo-erp src/app/util/companyConstants.mjs 와 코드를 맞춰 둔다.
 * 라벨은 i18n 키로 찾으므로 ellieo.com 등 다른 언어는 COMPANY_MESSAGES 에 추가하면 된다.
 */

export const COMPANY_INDUSTRIES = [
  'tech',
  'finance',
  'consulting',
  'consumer',
  'media',
  'healthcare',
  'energy',
  'government',
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

export const visaStatusLabelKey = (status: string) => `company.visa.${status}`
export const countryLabelKey = (code: string) => `company.country.${code}`

export const industryLabelKey = (code: string) => `company.industry.${code}`
export const atsLabelKey = (code: string) => `company.ats.${code}`

export const COMPANY_MESSAGES: Record<CompanyLocale, Record<string, string>> = {
  ko: {
    'company.industry.tech': '테크',
    'company.industry.finance': '금융',
    'company.industry.consulting': '컨설팅',
    'company.industry.consumer': '소비재·리테일',
    'company.industry.media': '미디어·엔터',
    'company.industry.healthcare': '헬스케어',
    'company.industry.energy': '에너지',
    'company.industry.government': '공공기관',
    'company.industry.education': '교육',
    'company.industry.other': '기타',
    'company.ats.greenhouse': 'Greenhouse',
    'company.ats.lever': 'Lever',
    'company.ats.workday': 'Workday',
    'company.ats.other': '기타',
    'company.ats.unknown': '모름',
    'company.visa.yes': '예',
    'company.visa.no': '아니오',
    'company.visa.case_by_case': '케이스별',
    'company.country.US': '미국',
    'company.country.KR': '한국',
    'company.country.CA': '캐나다',
    'company.country.GB': '영국',
    'company.country.JP': '일본',
    'company.country.SG': '싱가포르',
    'company.country.HK': '홍콩',
    'company.country.CN': '중국',
    'company.country.DE': '독일',
    'company.country.FR': '프랑스',
    'company.country.AU': '호주',
    'company.country.IN': '인도',
  },
  en: {
    'company.industry.tech': 'Tech',
    'company.industry.finance': 'Finance',
    'company.industry.consulting': 'Consulting',
    'company.industry.consumer': 'Consumer & Retail',
    'company.industry.media': 'Media & Entertainment',
    'company.industry.healthcare': 'Healthcare',
    'company.industry.energy': 'Energy',
    'company.industry.government': 'Government',
    'company.industry.education': 'Education',
    'company.industry.other': 'Other',
    'company.ats.greenhouse': 'Greenhouse',
    'company.ats.lever': 'Lever',
    'company.ats.workday': 'Workday',
    'company.ats.other': 'Other',
    'company.ats.unknown': 'Unknown',
    'company.visa.yes': 'Yes',
    'company.visa.no': 'No',
    'company.visa.case_by_case': 'Case by case',
    'company.country.US': 'United States',
    'company.country.KR': 'South Korea',
    'company.country.CA': 'Canada',
    'company.country.GB': 'United Kingdom',
    'company.country.JP': 'Japan',
    'company.country.SG': 'Singapore',
    'company.country.HK': 'Hong Kong',
    'company.country.CN': 'China',
    'company.country.DE': 'Germany',
    'company.country.FR': 'France',
    'company.country.AU': 'Australia',
    'company.country.IN': 'India',
  },
}

export function companyLabel(key: string, locale: CompanyLocale = 'ko'): string {
  return COMPANY_MESSAGES[locale]?.[key] ?? COMPANY_MESSAGES.en[key] ?? key
}

export const industryLabel = (code: string, locale?: CompanyLocale) =>
  companyLabel(industryLabelKey(code), locale)

export const countryLabel = (code: string, locale?: CompanyLocale) =>
  companyLabel(countryLabelKey(code), locale)

export const visaStatusLabel = (status: string, locale?: CompanyLocale) =>
  companyLabel(visaStatusLabelKey(status), locale)

export function isCompanyIndustry(value: unknown): value is CompanyIndustry {
  return typeof value === 'string' && (COMPANY_INDUSTRIES as readonly string[]).includes(value)
}

export const COMPANY_REVIEW_BOARD = 'job-review'
export const COMPANY_CLICK_KINDS = ['careers', 'students'] as const
export type CompanyClickKind = (typeof COMPANY_CLICK_KINDS)[number]
