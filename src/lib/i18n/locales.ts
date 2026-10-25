/**
 * 서비스(도시 사이트)에서 쓰는 언어. BCP 47 태그이고 URL 접두사·번역 저장 키로 그대로 쓴다.
 * ellieo-erp의 POSTING_LOCALES와 같은 코드를 써야 한다 (zh-CN = 간체, zh-TW = 대만 번체).
 */
export const LOCALES = ['en', 'ko', 'vi', 'ja', 'zh-CN', 'zh-TW', 'id'] as const

export type Locale = (typeof LOCALES)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** 대소문자·구분자가 달라도 (`zh-tw`, `zh_TW`) 같은 언어로 읽는다. */
export function parseLocale(value: string | null | undefined): Locale | null {
  const raw = String(value || '').trim().replace('_', '-').toLowerCase()
  if (!raw) return null
  const exact = LOCALES.find((locale) => locale.toLowerCase() === raw)
  if (exact) return exact
  if (raw === 'zh-hant' || raw === 'zh-hk' || raw === 'zh-mo') return 'zh-TW'
  if (raw === 'zh' || raw === 'zh-hans' || raw === 'zh-sg') return 'zh-CN'
  if (raw === 'in') return 'id'
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
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  id: 'Bahasa Indonesia',
}

/** Intl.DisplayNames용 코드. zh-CN/zh-TW는 나라 대신 문자(간체·번체)로 부른다. */
const DISPLAY_CODES: Record<Locale, string> = {
  en: 'en',
  ko: 'ko',
  vi: 'vi',
  ja: 'ja',
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  id: 'id',
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
  ja: 'ja_JP',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  id: 'id_ID',
}

/** 언어 쿠키. 언어 메뉴·마이페이지·가입 때 고른 언어. 브라우저 언어 자동 감지는 저장하지 않는다. */
export const LOCALE_COOKIE = 'misaeng_locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
