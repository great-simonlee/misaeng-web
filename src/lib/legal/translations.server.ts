import type { LegalTranslationFile } from '@lib/constants/legalDocument'
import type { Locale } from '@lib/i18n/locales'

/**
 * 약관·개인정보처리방침의 ko 외 참고 번역 (src/lib/legal/translations/<doc>.<locale>.json).
 * 영어가 기준이고 번역은 참고용이다. 영어 문단을 고치면 그 문단의 번역은 자동으로 빠진다
 * (scripts/legal-translation-source.mjs로 번역할 문단 목록을 다시 뽑아 번역한다).
 */
export async function loadLegalTranslations(
  doc: 'terms' | 'privacy',
  locale: Locale,
): Promise<LegalTranslationFile | null> {
  if (locale === 'en' || locale === 'ko') return null
  try {
    const mod = (await import(`./translations/${doc}.${locale}.json`)) as { default: LegalTranslationFile }
    return mod.default
  } catch {
    return null
  }
}
