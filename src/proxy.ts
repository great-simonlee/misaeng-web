import { NextResponse, type NextRequest } from 'next/server'

import {
  BRAND_CONFIG,
  brandConfig,
  brandLocalePath,
  indexedBrandFor,
  isServiceLocale,
  resolveServiceLocale,
} from '@lib/brand'
import { isCityId } from '@lib/constants/cities'
import { isLocale, LOCALE_COOKIE, LOCALES, parseLocale, type Locale } from '@lib/i18n/locales'

/**
 * 서비스 언어 라우팅 + 검색 신호.
 *
 * URL
 * - `/nyc/...`      → 브랜드 기본 언어. 내부적으로 `/{기본언어}/nyc/...`로 rewrite
 * - `/vi/nyc/...`   → 그 언어. 기본 언어 접두사(`/ko/nyc` on misaeng)는 접두사 없는 주소로 308
 * - 브랜드가 지원하지 않는 언어(`/vi/nyc` on misaeng)는 대체 언어로 308
 *
 * 언어 선택 (접두사 없는 주소로 들어왔을 때만)
 * 1. 언어 쿠키 — 언어 메뉴·마이페이지·가입에서 고른 언어
 * 2. 같은 사이트의 이전 페이지 언어(Referer) — 접두사 없이 만든 링크를 눌러도 언어가 유지되게
 * 브라우저 언어로 자동 이동하지 않는다 (기본 언어 고정 + 검색 로봇은 쿠키 없이 기본 언어를 본다).
 *
 * 검색 (HTTP Link 헤더)
 * - 한 언어는 한 도메인에서만 검색된다: ko → misaeng, 나머지 → ellieo
 * - canonical은 그 언어가 검색되는 도메인을 가리킨다 (misaeng `/en/...` → ellieo, ellieo `/ko/...` → misaeng)
 * - hreflang으로 두 도메인의 언어 버전을 하나로 묶는다
 */

/** 회사 사이트 경로. ellieo에는 없으므로 misaeng.com으로 보낸다. */
const CORPORATE_PATHS = new Set([
  'about',
  'careers',
  'contact',
  'credit',
  'our-service',
  'privacy',
  'roadmap',
  'terms',
])

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]

  if (!BRAND_CONFIG.hasCorporateSite) {
    if (!first) return redirectTo(request, servicePathFor(request, '/nyc'), 307)
    if (CORPORATE_PATHS.has(first)) {
      const misaeng = brandConfig('misaeng')
      return NextResponse.redirect(`${misaeng.siteUrl}${pathname}${search}`, 308)
    }
  }

  if (isLocale(first)) {
    const rest = `/${segments.slice(1).join('/')}`
    if (!isCityId(segments[1])) {
      // `/vi` 단독 → 그 언어의 기본 도시
      if (segments.length === 1) return redirectTo(request, `/${first}/nyc`, 307)
      return NextResponse.next()
    }
    if (!isServiceLocale(first)) {
      return redirectTo(request, brandLocalePath(BRAND_CONFIG, resolveServiceLocale(first), rest), 308)
    }
    if (first === BRAND_CONFIG.serviceDefaultLocale) {
      return redirectTo(request, rest, 308)
    }
    return withSearchHeaders(NextResponse.next(), first, rest)
  }

  if (isCityId(first)) {
    const chosen = request.method === 'GET' ? preferredLocale(request) : null
    if (chosen && chosen !== BRAND_CONFIG.serviceDefaultLocale) {
      return redirectTo(request, `/${chosen}${pathname}`, 307)
    }
    const url = request.nextUrl.clone()
    url.pathname = `/${BRAND_CONFIG.serviceDefaultLocale}${pathname}`
    return withSearchHeaders(
      NextResponse.rewrite(url),
      BRAND_CONFIG.serviceDefaultLocale,
      pathname,
    )
  }

  return NextResponse.next()
}

function redirectTo(request: NextRequest, pathname: string, status: 307 | 308) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url, status)
}

/** ellieo `/` → 고른 언어의 `/nyc` */
function servicePathFor(request: NextRequest, path: string) {
  const chosen = preferredLocale(request)
  return brandLocalePath(BRAND_CONFIG, chosen ?? BRAND_CONFIG.serviceDefaultLocale, path)
}

function preferredLocale(request: NextRequest): Locale | null {
  const fromCookie = parseLocale(request.cookies.get(LOCALE_COOKIE)?.value)
  if (fromCookie) return resolveServiceLocale(fromCookie)

  const referer = request.headers.get('referer')
  if (!referer) return null
  try {
    const ref = new URL(referer)
    if (ref.host !== request.nextUrl.host) return null
    const refFirst = ref.pathname.split('/').filter(Boolean)[0]
    return isLocale(refFirst) && isServiceLocale(refFirst) ? refFirst : null
  } catch {
    return null
  }
}

/** `path`는 언어 접두사를 뗀 서비스 경로 (`/nyc/food/123`) */
function withSearchHeaders(response: NextResponse, locale: Locale, path: string) {
  const links: string[] = []

  const canonicalBrand = indexedBrandFor(locale)
  if (canonicalBrand) {
    links.push(`<${canonicalBrand.siteUrl}${brandLocalePath(canonicalBrand, locale, path)}>; rel="canonical"`)
  }

  for (const alt of LOCALES) {
    const brand = indexedBrandFor(alt)
    if (!brand) continue
    links.push(
      `<${brand.siteUrl}${brandLocalePath(brand, alt, path)}>; rel="alternate"; hreflang="${alt}"`,
    )
  }
  const ellieo = brandConfig('ellieo')
  links.push(
    `<${ellieo.siteUrl}${brandLocalePath(ellieo, ellieo.serviceDefaultLocale, path)}>; rel="alternate"; hreflang="x-default"`,
  )

  response.headers.set('Link', links.join(', '))
  return response
}

export const config = {
  // API·정적 파일·Next 내부 경로는 건너뛴다
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
