/** 영문(기준) + 한글(참고) 쌍 */
export type BilingualText = {
  en: string
  ko: string
}

/** 법률 문서 본문 블록 — 영어가 공식 문구, 한글은 참고 번역 */
export type LegalBlock =
  | { type: 'p'; en: string; ko: string }
  | { type: 'ul'; items: readonly BilingualText[] }
  | { type: 'ol'; items: readonly BilingualText[] }
  | { type: 'note'; en: string; ko: string }

export type LegalSection = {
  id: string
  title: string
  titleKo: string
  /** 중재 등 눈에 띄게 표시할 조항 */
  emphasized?: boolean
  blocks: readonly LegalBlock[]
}

export type LegalDocument = {
  eyebrow: string
  title: string
  titleKo: string
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
