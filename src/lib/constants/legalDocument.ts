import type { Locale } from '@lib/i18n/locales'

/** 영어 외 참고 번역 언어 */
export type LegalReferenceLocale = Exclude<Locale, 'en'>

/**
 * 영문(기준) + 참고 번역. ko는 처음부터 있던 번역이라 필수이고, 나머지 언어는 번역되는 대로 채운다.
 * 빠진 언어는 화면에서 영어만 보여 준다.
 */
export type BilingualText = { en: string; ko: string } & Partial<
  Record<Exclude<LegalReferenceLocale, 'ko'>, string>
>

/** 법률 문서 본문 블록 — 영어가 공식 문구, 다른 언어는 참고 번역 */
export type LegalBlock =
  | ({ type: 'p' } & BilingualText)
  | { type: 'ul'; items: readonly BilingualText[] }
  | { type: 'ol'; items: readonly BilingualText[] }
  | ({ type: 'note' } & BilingualText)

/** 제목류의 ko 외 참고 번역 */
export type LegalTitleTranslations = Partial<Record<Exclude<LegalReferenceLocale, 'ko'>, string>>

export type LegalSection = {
  id: string
  title: string
  titleKo: string
  titleTranslations?: LegalTitleTranslations
  /** 중재 등 눈에 띄게 표시할 조항 */
  emphasized?: boolean
  blocks: readonly LegalBlock[]
}

export type LegalDocument = {
  eyebrow: string
  title: string
  titleKo: string
  titleTranslations?: LegalTitleTranslations
  /** Machine version id (YYYY-MM-DD). Used for clickwrap / re-consent. */
  version: string
  lastUpdated: string
  lastUpdatedKo: string
  effectiveDate: string
  effectiveDateKo: string
  /** 언어 우선순위 고지 (영어 우선) */
  languageNotice: BilingualText
  intro: readonly BilingualText[]
  sections: readonly LegalSection[]
  contactEmail: string
  companyName: string
  companyAddress: string
}

/* ───────────── 화면용: 영어 + 보는 언어 하나만 남긴 문서 ───────────── */

/** `ref`는 보는 언어의 참고 번역. 영어 화면이거나 아직 번역이 없으면 없다. */
export type LegalViewText = { en: string; ref?: string }

export type LegalViewBlock =
  | ({ type: 'p' } & LegalViewText)
  | ({ type: 'note' } & LegalViewText)
  | { type: 'ul'; items: LegalViewText[] }
  | { type: 'ol'; items: LegalViewText[] }

export type LegalViewDocument = {
  /** 참고 번역 언어. 영어 화면이면 null */
  refLocale: LegalReferenceLocale | null
  /** 참고 번역이 일부라도 빠졌는가 (번역 준비 중 안내용) */
  refIncomplete: boolean
  eyebrow: string
  title: LegalViewText
  version: string
  lastUpdated: string
  effectiveDate: string
  languageNotice: LegalViewText
  intro: LegalViewText[]
  sections: Array<{
    id: string
    title: LegalViewText
    emphasized?: boolean
    blocks: LegalViewBlock[]
  }>
  contactEmail: string
}

/**
 * ko 외 참고 번역 파일 (src/lib/legal/translations/<doc>.<locale>.json):
 * 영어 문단의 해시(legalTextKey) → 번역문. 영어 문단이 바뀌면 해시가 달라져 그 문단만 영어로 보인다.
 */
export type LegalTranslationFile = { texts: Record<string, string> }

/** 영어 문구의 키 (FNV-1a 32bit) */
export function legalTextKey(en: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < en.length; i += 1) {
    hash ^= en.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * 서버에서 보는 언어 하나만 골라 브라우저로 보낸다 (7개 언어 전문을 모두 보내지 않게).
 * ko는 문서 안의 ko, 다른 언어는 translations 파일(또는 문서 안의 같은 언어 키)에서 찾는다.
 */
export function toLegalViewDocument(
  doc: LegalDocument,
  locale: Locale,
  translations?: LegalTranslationFile | null,
): LegalViewDocument {
  const refLocale: LegalReferenceLocale | null = locale === 'en' ? null : locale
  let missing = false
  const fromFile = (en: string) => translations?.texts[legalTextKey(en)]

  const text = (value: BilingualText): LegalViewText => {
    if (!refLocale) return { en: value.en }
    const ref = (value as Record<string, string | undefined>)[refLocale] ?? fromFile(value.en)
    if (!ref) missing = true
    return ref ? { en: value.en, ref } : { en: value.en }
  }
  const title = (en: string, ko: string, others?: LegalTitleTranslations): LegalViewText => {
    if (!refLocale) return { en }
    const ref = refLocale === 'ko' ? ko : (others?.[refLocale] ?? fromFile(en))
    if (!ref) missing = true
    return ref ? { en, ref } : { en }
  }

  const view: LegalViewDocument = {
    refLocale,
    refIncomplete: false,
    eyebrow: doc.eyebrow,
    title: title(doc.title, doc.titleKo, doc.titleTranslations),
    version: doc.version,
    lastUpdated: doc.lastUpdated,
    effectiveDate: doc.effectiveDate,
    languageNotice: text(doc.languageNotice),
    intro: doc.intro.map(text),
    sections: doc.sections.map((section) => ({
      id: section.id,
      title: title(section.title, section.titleKo, section.titleTranslations),
      emphasized: section.emphasized,
      blocks: section.blocks.map((block): LegalViewBlock => {
        if (block.type === 'ul' || block.type === 'ol') return { type: block.type, items: block.items.map(text) }
        return block.type === 'p' ? { type: 'p', ...text(block) } : { type: 'note', ...text(block) }
      }),
    })),
    contactEmail: doc.contactEmail,
  }
  view.refIncomplete = missing
  return view
}
