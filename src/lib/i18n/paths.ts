import { BRAND_CONFIG, brandLocalePath } from '@lib/brand'
import { isCityId } from '@lib/constants/cities'

import { isLocale, type Locale } from './locales'

/**
 * 서비스 URL 규칙
 * - 기본 언어: `/nyc/housing` (내부적으로 proxy가 `/{기본언어}/nyc/housing`으로 rewrite)
 * - 다른 언어: `/vi/nyc/housing`
 * 회사 페이지(`/about` 등)에는 접두사가 없다.
 */

/** `localePath('vi', '/nyc/housing')` → `/vi/nyc/housing`, 기본 언어면 그대로 */
export function localePath(locale: Locale, path: string): string {
  return brandLocalePath(BRAND_CONFIG, locale, path)
}

/** 경로 앞의 언어 접두사를 떼어 낸다. `/vi/nyc/food` → { locale: 'vi', path: '/nyc/food' } */
export function splitLocalePath(pathname: string): {
  locale: Locale | null
  path: string
} {
  const parts = pathname.split('/')
  const first = parts[1]
  if (isLocale(first)) {
    const rest = parts.slice(2).join('/')
    return { locale: first, path: rest ? `/${rest}` : '/' }
  }
  return { locale: null, path: pathname || '/' }
}

/** 접두사를 뗀 경로 (도시 판별 등 언어와 상관없는 로직용) */
export function stripLocalePrefix(pathname: string): string {
  return splitLocalePath(pathname).path
}

/** 현재 주소의 언어. 접두사가 없으면 브랜드 기본 언어 */
export function localeFromPathname(pathname: string): Locale {
  return splitLocalePath(pathname).locale ?? BRAND_CONFIG.serviceDefaultLocale
}

/** 도시 서비스 경로인가 (`/nyc/...`, `/vi/nyc/...`) */
export function isServicePathname(pathname: string): boolean {
  const first = stripLocalePrefix(pathname).split('/').filter(Boolean)[0]
  return isCityId(first)
}

/** 같은 페이지를 다른 언어 주소로. `/vi/nyc/food` + ja → `/ja/nyc/food` */
export function switchLocalePath(pathname: string, locale: Locale): string {
  return localePath(locale, stripLocalePrefix(pathname))
}
