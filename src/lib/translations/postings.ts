import type { Locale } from '@lib/i18n/locales'
import type { PublicPosting } from '@lib/company/postings'

import type { ContentI18n } from './content'

/**
 * 채용 공고 요약 번역. 한국어 summary가 원문이고, ellieo-erp(Jobs → Postings)가
 * job_postings.summary_translations 에 { en: { overview, qualifications, workType, location, applyNotes, sourceHash } }
 * 형태로 저장한다. sourceHash 규칙은 ellieo-erp src/app/util/postingTranslations.mjs summarySourceHash 와 같다.
 */

export const POSTING_SOURCE_LOCALE: Locale = 'ko'

const TRANSLATED_FIELDS = ['overview', 'qualifications', 'workType', 'location', 'applyNotes'] as const
const LIST_FIELDS: readonly string[] = ['overview', 'qualifications', 'applyNotes']

const cleanLine = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const cleanLines = (value: unknown) =>
  (Array.isArray(value) ? value : String(value || '').split('\n')).map(cleanLine).filter(Boolean)

export type PostingSummaryTranslation = {
  overview: string[]
  qualifications: string[]
  workType: string
  location: string
  applyNotes: string[]
  sourceHash: string
}

export function summarySourceHash(summary: Record<string, unknown> | null | undefined): string | null {
  if (!summary) return null
  const source = JSON.stringify(
    TRANSLATED_FIELDS.map((key) => (LIST_FIELDS.includes(key) ? cleanLines(summary[key]) : cleanLine(summary[key]))),
  )
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** DB 값 → 최신인 번역만 남긴다 (한국어 요약이 바뀐 뒤의 번역은 버린다) */
export function freshSummaryTranslations(
  summary: Record<string, unknown> | null | undefined,
  raw: unknown,
): Partial<Record<Locale, PostingSummaryTranslation>> {
  const hash = summarySourceHash(summary)
  if (!hash || !raw || typeof raw !== 'object') return {}
  const out: Partial<Record<Locale, PostingSummaryTranslation>> = {}
  for (const [code, value] of Object.entries(raw as Record<string, Record<string, unknown>>)) {
    if (!value || value.sourceHash !== hash) continue
    const overview = cleanLines(value.overview)
    if (!overview.length) continue
    out[code as Locale] = {
      overview,
      qualifications: cleanLines(value.qualifications),
      workType: cleanLine(value.workType),
      location: cleanLine(value.location),
      applyNotes: cleanLines(value.applyNotes),
      sourceHash: hash,
    }
  }
  return out
}

/** 보는 언어의 요약으로 바꾸고, 저장된 다른 언어 번역은 응답에서 뺀다 */
export function localizePosting(
  posting: PublicPosting & { summaryTranslations?: Partial<Record<Locale, PostingSummaryTranslation>> },
  locale: Locale,
): PublicPosting & { i18n: ContentI18n } {
  const { summaryTranslations, ...rest } = posting
  const base = { sourceLocale: POSTING_SOURCE_LOCALE, displayLocale: locale }
  if (locale === POSTING_SOURCE_LOCALE) return { ...rest, i18n: { ...base, state: 'original' } }
  const translation = summaryTranslations?.[locale]
  if (!translation) return { ...rest, i18n: { ...base, state: 'pending' } }
  return {
    ...rest,
    summary: {
      ...rest.summary,
      overview: translation.overview,
      qualifications: translation.qualifications,
      workType: translation.workType,
      location: translation.location,
      applyNotes: translation.applyNotes,
    },
    i18n: { ...base, state: 'translated' },
  }
}
