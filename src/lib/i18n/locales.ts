/**
 * 서비스(도시 사이트)에서 쓰는 언어. BCP 47 태그이고 URL 접두사·번역 저장 키로 그대로 쓴다.
 * misaeng: ko(기본) + en / ellieo: en(기본) + vi (D-010, 2026-10-30).
 * ja·zh-CN·zh-TW·id는 삭제했다. 옛 주소는 proxy가 대체 언어로 301, 저장된 번역의 옛 키는 isLocale로 걸러진다.
 * ellieo-erp의 POSTING_LOCALES와 같은 코드를 써야 한다 (ERP 쪽 정리는 docs/STATUS.md 참고).
 */
export const LOCALES = ['en', 'ko', 'vi'] as const

/** 삭제한 언어 접두사. 옛 링크(`/ja/nyc/...`)를 대체 언어 주소로 301 한다. */
export const REMOVED_LOCALE_PREFIXES = ['ja', 'zh-CN', 'zh-TW', 'id'] as const

export type Locale = (typeof LOCALES)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** 대소문자·구분자가 달라도 (`VI`, `en_US`) 같은 언어로 읽는다. */
export function parseLocale(value: string | null | undefined): Locale | null {
  const raw = String(value || '').trim().replace('_', '-').toLowerCase()
  if (!raw) return null
  const exact = LOCALES.find((locale) => locale.toLowerCase() === raw)
  if (exact) return exact
  const base = raw.split('-')[0]
  return LOCALES.find((locale) => locale === base) ?? null
}

/** Accept-Language / navigator.languages 순서대로 처음 맞는 언어 */
export function matchLocale(
  candidates: readonly string[],
  supported: readonly Locale[],
): Locale | null {
  for (const candidate of candidates) {
    const locale = parseLocale(candidate)
    if (locale && supported.includes(locale)) return locale
  }
  return null
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  return String(header || '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((entry) => entry.tag && entry.tag !== '*')
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
}

/** 언어 메뉴에 그 언어 글자로 보여 주는 이름 */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  vi: 'Tiếng Việt',
}

/** Intl.DisplayNames용 코드 */
const DISPLAY_CODES: Record<Locale, string> = {
  en: 'en',
  ko: 'ko',
  vi: 'vi',
}

/** `localeDisplayName('vi', 'ko')` → `베트남어` */
export function localeDisplayName(locale: Locale, inLocale: Locale): string {
  try {
    const names = new Intl.DisplayNames([inLocale], { type: 'language' })
    return names.of(DISPLAY_CODES[locale]) || LOCALE_NATIVE_NAMES[locale]
  } catch {
    return LOCALE_NATIVE_NAMES[locale]
  }
}

/** Open Graph `og:locale` 값 */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  ko: 'ko_KR',
  vi: 'vi_VN',
}

/** 언어 쿠키. 언어 메뉴·마이페이지·가입 때 고른 언어. 브라우저 언어 자동 감지는 저장하지 않는다. */
export const LOCALE_COOKIE = 'misaeng_locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
