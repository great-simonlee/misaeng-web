import { cookies, headers } from 'next/headers'

import { BRAND_CONFIG, resolveServiceLocale } from '@lib/brand'

import { isLocale, LOCALE_COOKIE, parseLocale, type Locale } from './locales'
import { getMessages } from './messages.server'
import { createTranslator, type Translate } from './translate'

/**
 * 서버 컴포넌트·API 라우트용 번역.
 *
 * API 라우트는 URL에 언어가 없어서 이 순서로 정한다:
 * 1. `x-locale` 헤더 (클라이언트가 명시한 경우)
 * 2. Referer 경로의 언어 접두사 (`/vi/nyc/...`) — 같은 사이트 fetch는 Referer에 현재 페이지가 실린다
 * 3. Referer가 서비스 기본 언어 주소면 기본 언어
 * 4. 언어 쿠키
 */

export async function getT(locale: Locale, namespace?: string): Promise<Translate> {
  const t = createTranslator(await getMessages(locale), locale)
  return namespace ? (key, params) => t(`${namespace}.${key}`, params) : t
}

export function localeFromHeaders(get: (name: string) => string | null | undefined): Locale | null {
  const explicit = parseLocale(get('x-locale'))
  if (explicit) return resolveServiceLocale(explicit)

  const referer = get('referer')
  if (referer) {
    try {
      const first = new URL(referer).pathname.split('/').filter(Boolean)[0]
      if (isLocale(first)) return resolveServiceLocale(first)
      return BRAND_CONFIG.serviceDefaultLocale
    } catch {
      // Referer가 이상하면 쿠키로
    }
  }
  return null
}

/**
 * 요청 언어. API 라우트는 request를 넘기고, 서버 컴포넌트·서버 액션은 생략하면 현재 요청 헤더를 읽는다.
 * `const t = await getRequestT(request, 'api')`
 */
export async function getRequestLocale(request?: Request): Promise<Locale> {
  const list = request ? request.headers : await headers()
  const fromHeaders = localeFromHeaders((name) => list.get(name))
  if (fromHeaders) return fromHeaders

  const jar = await cookies()
  const fromCookie = parseLocale(jar.get(LOCALE_COOKIE)?.value)
  if (fromCookie) return resolveServiceLocale(fromCookie)

  return BRAND_CONFIG.serviceDefaultLocale
}

export async function getRequestT(request?: Request, namespace?: string): Promise<Translate> {
  return getT(await getRequestLocale(request), namespace)
}
