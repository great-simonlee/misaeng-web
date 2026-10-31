import type { Locale } from '@lib/i18n/locales'

/**
 * 한 코드베이스로 두 서비스를 배포한다. Vercel 프로젝트마다 NEXT_PUBLIC_BRAND를 다르게 둔다.
 * - misaeng: misaeng.com. 회사 페이지(영어) + 도시 서비스(한국어 기본, 영어)
 * - ellieo: 도시 서비스(영어 기본 + 베트남어) + 모바일 앱 페이지
 * 브랜드별 차이는 이 파일에만 둔다. 화면 코드는 `BRAND_CONFIG` 값만 읽는다.
 */
export const BRAND_IDS = ['misaeng', 'ellieo'] as const

export type BrandId = (typeof BRAND_IDS)[number]

export type BrandConfig = {
  id: BrandId
  name: string
  /**
   * 사이트 주소 (끝 슬래시 없음). NEXT_PUBLIC_SITE_URL이 있으면 두 브랜드 모두 그 값이 된다 (기존 동작, docs/STATUS.md 참고).
   */
  siteUrl: string
  /** 항상 그 브랜드의 운영 도메인. 다른 브랜드로 보내는 리다이렉트(ellieo `/ko/...` → misaeng.com)에 쓴다 */
  productionUrl: string
  /** 도시 서비스에서 고를 수 있는 언어 */
  serviceLocales: readonly Locale[]
  /** URL 접두사 없이 보여 주는 언어 (`/nyc/...`). 나머지는 `/vi/nyc/...` */
  serviceDefaultLocale: Locale
  /** 검색에 노출하는 언어. 나머지는 noindex 또는 다른 브랜드로 canonical */
  indexedLocales: readonly Locale[]
  /** 이 브랜드가 지원하지 않는 언어를 고른 사용자에게 보여 줄 언어 */
  fallbackLocale: Locale
  /** 날짜 표기용 BCP 47 태그 덮어쓰기. Ellieo는 영어도 일/월/년 (브리프 8장): { en: 'en-GB' } */
  dateLocales: Partial<Record<Locale, string>>
  /** 다른 브랜드에서 서비스하는 언어. 이 접두사(`/ko/nyc` on ellieo)는 다른 브랜드 도메인으로 301 */
  otherBrandLocales: readonly Locale[]
  /** 회사 소개 페이지(about, careers …)를 이 도메인에서 서비스하는가 */
  hasCorporateSite: boolean
  /** 모바일 앱 소개 페이지 */
  hasMobileAppPage: boolean
  /** 브랜드 색. globals.css의 `[data-brand]` 토큰과 같아야 한다 (OG 이미지 등 CSS 밖에서 쓸 때) */
  colors: { brand: string; brandHover: string }
  /**
   * 화면 테마. `misaeng`은 기존 화면, `ellieo`는 Ellieo 전용 화면(헤더·푸터·홈·카드)을 고른다.
   * 색·글꼴·모서리·그림자 토큰은 globals.css `[data-brand]`에 있다.
   */
  theme: BrandId
  /** 홈·파트너 영역 노출 (Ellieo VSA 영역은 구조만 두고 기본 숨김, 브리프 3장) */
  sections: {
    /** 한인 학생회 파트너 (KISO 등) */
    koreanPartnerSchools: boolean
    /** 한인 인플루언서 카드 */
    partnerInfluencers: boolean
  }
  /**
   * 신뢰 표시 (하단). 빈 값은 화면에서 숨긴다.
   * operator 문장은 i18n `nav.trust.operatedBy`에 넣고 회사명·도시만 여기 둔다.
   */
  trust: {
    operator: { name: string; city: string } | null
    /** 뉴욕주 부동산 라이선스 번호. 확인 필요 — 확정 전까지 빈 값 */
    realEstateLicense: string
    /** 소속 브로커리지. 확인 필요 — 확정 전까지 빈 값 */
    brokerage: string
    /** 등록 상표 표시 (wordmark 옆 ®) */
    registeredMark: boolean
    /** USPTO 등록번호 (푸터 표기). 빈 값이면 숨김 */
    trademarkRegNo: string
    /** 신고 처리 약속 시간 (사기·개인정보 신고, 브리프 3장). 화면 문구는 이 값으로 치환 */
    reportSlaHours: number | null
  }
  /** 로고·아이콘 (public/ 경로) */
  assets: {
    /** 가로형 로고 (헤더) */
    banner: { src: string; width: number; height: number }
    /** 정사각형 아이콘 (로딩, 푸터) */
    square: string
    /** Symbol over the wordmark (loading screens). Falls back to `square` when absent */
    vertical?: string
    favicon: string
  }
}

const MISAENG: BrandConfig = {
  id: 'misaeng',
  name: 'Misaeng',
  siteUrl: siteUrlFromEnv('https://misaeng.com'),
  productionUrl: 'https://misaeng.com',
  serviceLocales: ['ko', 'en'],
  serviceDefaultLocale: 'ko',
  indexedLocales: ['ko'],
  fallbackLocale: 'en',
  otherBrandLocales: [],
  dateLocales: {},
  hasCorporateSite: true,
  hasMobileAppPage: true,
  theme: 'misaeng',
  sections: { koreanPartnerSchools: true, partnerInfluencers: true },
  trust: {
    operator: null,
    realEstateLicense: '',
    brokerage: '',
    registeredMark: false,
    trademarkRegNo: '',
    reportSlaHours: null,
  },
  colors: { brand: '#F64310', brandHover: '#d93a0e' },
  assets: {
    banner: { src: '/banner.png', width: 560, height: 120 },
    square: '/img/logo_square.png',
    favicon: '/favicon.ico',
  },
}

const ELLIEO: BrandConfig = {
  id: 'ellieo',
  name: 'Ellieo',
  siteUrl: siteUrlFromEnv('https://ellieo.com'),
  productionUrl: 'https://ellieo.com',
  // D-010: English default (no prefix) + Vietnamese (/vi/...). ko lives on misaeng.com.
  serviceLocales: ['en', 'vi'],
  serviceDefaultLocale: 'en',
  indexedLocales: ['en', 'vi'],
  fallbackLocale: 'en',
  otherBrandLocales: ['ko'],
  dateLocales: { en: 'en-GB' },
  hasCorporateSite: false,
  hasMobileAppPage: true,
  theme: 'ellieo',
  sections: { koreanPartnerSchools: false, partnerInfluencers: false },
  trust: {
    operator: { name: 'Misaeng LLC', city: 'New York' },
    // 확인 필요: NY real estate license no. / brokerage name. Hidden while empty.
    realEstateLicense: '',
    brokerage: '',
    registeredMark: true,
    trademarkRegNo: '8509979',
    reportSlaHours: 48,
  },
  colors: { brand: '#1f5eff', brandHover: '#1748c7' },
  assets: {
    banner: { src: '/brand/ellieo-banner.png', width: 1073, height: 296 },
    square: '/img/ellieo_logo.png',
    vertical: '/brand/ellieo-logo-vertical.png',
    favicon: '/brand/ellieo-favicon.ico',
  },
}

function siteUrlFromEnv(fallback: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallback).replace(/\/+$/, '')
}

export const BRAND: BrandId =
  process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase() === 'ellieo' ? 'ellieo' : 'misaeng'

export const BRAND_CONFIG: BrandConfig = BRAND === 'ellieo' ? ELLIEO : MISAENG

/** 다른 브랜드 설정 (hreflang·canonical로 서로 가리킬 때) */
export const OTHER_BRAND_CONFIG: BrandConfig = BRAND === 'ellieo' ? MISAENG : ELLIEO

export function brandConfig(id: BrandId): BrandConfig {
  return id === 'ellieo' ? ELLIEO : MISAENG
}

/**
 * 언어별로 검색에 노출되는 브랜드. 같은 글이 두 도메인에서 같은 언어로 검색되지 않게 한다.
 * ko → misaeng, en·vi → ellieo
 */
export function indexedBrandFor(locale: Locale): BrandConfig | null {
  if (MISAENG.indexedLocales.includes(locale)) return MISAENG
  if (ELLIEO.indexedLocales.includes(locale)) return ELLIEO
  return null
}

/** 그 브랜드 기준의 서비스 경로. `brandLocalePath(ELLIEO, 'ko', '/nyc')` → `/ko/nyc` */
export function brandLocalePath(brand: BrandConfig, locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (locale === brand.serviceDefaultLocale) return normalized
  return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`
}

export function isServiceLocale(locale: Locale, brand: BrandConfig = BRAND_CONFIG): boolean {
  return brand.serviceLocales.includes(locale)
}

/** 사용자가 고른 언어를 이 브랜드에서 보여 줄 언어로 바꾼다. misaeng에서 vi → en */
export function resolveServiceLocale(
  locale: Locale | null | undefined,
  brand: BrandConfig = BRAND_CONFIG,
): Locale {
  if (!locale) return brand.serviceDefaultLocale
  return brand.serviceLocales.includes(locale) ? locale : brand.fallbackLocale
}
