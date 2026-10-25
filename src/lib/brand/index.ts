import type { Locale } from '@lib/i18n/locales'

/**
 * 한 코드베이스로 두 서비스를 배포한다. Vercel 프로젝트마다 NEXT_PUBLIC_BRAND를 다르게 둔다.
 * - misaeng: misaeng.com. 회사 페이지(영어) + 도시 서비스(한국어 기본, 영어)
 * - ellieo: 도시 서비스(영어 기본 + 6개 언어) + 모바일 앱 페이지
 * 브랜드별 차이는 이 파일에만 둔다. 화면 코드는 `BRAND_CONFIG` 값만 읽는다.
 */
export const BRAND_IDS = ['misaeng', 'ellieo'] as const

export type BrandId = (typeof BRAND_IDS)[number]

export type BrandConfig = {
  id: BrandId
  name: string
  /** 정식 사이트 주소 (끝 슬래시 없음) */
  siteUrl: string
  /** 도시 서비스에서 고를 수 있는 언어 */
  serviceLocales: readonly Locale[]
  /** URL 접두사 없이 보여 주는 언어 (`/nyc/...`). 나머지는 `/vi/nyc/...` */
  serviceDefaultLocale: Locale
  /** 검색에 노출하는 언어. 나머지는 noindex 또는 다른 브랜드로 canonical */
  indexedLocales: readonly Locale[]
  /** 이 브랜드가 지원하지 않는 언어를 고른 사용자에게 보여 줄 언어 */
  fallbackLocale: Locale
  /** 회사 소개 페이지(about, careers …)를 이 도메인에서 서비스하는가 */
  hasCorporateSite: boolean
  /** 모바일 앱 소개 페이지 */
  hasMobileAppPage: boolean
  /** 브랜드 색. globals.css의 `[data-brand]` 토큰과 같아야 한다 (OG 이미지 등 CSS 밖에서 쓸 때) */
  colors: { brand: string; brandHover: string }
  /** 로고·아이콘 (public/ 경로) */
  assets: {
    /** 가로형 로고 (헤더) */
    banner: { src: string; width: number; height: number }
    /** 정사각형 아이콘 (로딩, 푸터) */
    square: string
    favicon: string
  }
}

const MISAENG: BrandConfig = {
  id: 'misaeng',
  name: 'Misaeng',
  siteUrl: siteUrlFromEnv('https://misaeng.com'),
  serviceLocales: ['ko', 'en'],
  serviceDefaultLocale: 'ko',
  indexedLocales: ['ko'],
  fallbackLocale: 'en',
  hasCorporateSite: true,
  hasMobileAppPage: true,
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
  serviceLocales: ['en', 'ko', 'vi', 'ja', 'zh-CN', 'zh-TW', 'id'],
  serviceDefaultLocale: 'en',
  indexedLocales: ['en', 'vi', 'ja', 'zh-CN', 'zh-TW', 'id'],
  fallbackLocale: 'en',
  hasCorporateSite: false,
  hasMobileAppPage: true,
  colors: { brand: '#2f6df6', brandHover: '#2455c4' },
  assets: {
    banner: { src: '/brand/ellieo-banner.png', width: 1073, height: 296 },
    square: '/img/ellieo_logo.png',
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
 * ko → misaeng, 나머지 → ellieo
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
