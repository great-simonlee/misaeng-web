import type { BrandId } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'

/** 동의 화면을 보여 준 언어 (사용자가 실제로 읽은 언어). 법적 기준은 항상 영문본이다. */
export type ConsentUiLanguage = Locale

/** 동의한 사이트 */
export type ConsentBrand = BrandId

export type ConsentMethod =
  | 'signup_checkbox'
  | 'reconsent_modal'
  | 'google_signup_checkbox'
  | 'apple_signup_checkbox'

export type LegalChangeType = 'material' | 'minor'

export type LegalPolicy = {
  termsVersion: string
  privacyVersion: string
  termsChangeType: LegalChangeType
  privacyChangeType: LegalChangeType
  summaryEn: string
  summaryKo: string
  publishedAt: string
  publishedBy: string | null
}

export type ConsentLog = {
  id: string
  user_id: string
  email: string | null
  terms_version: string
  privacy_version: string
  consented_at: string
  ip_address: string | null
  user_agent: string | null
  consent_method: ConsentMethod
  ui_language: ConsentUiLanguage
  /** 동의한 사이트 (없으면 misaeng — 2026-10 이전 기록) */
  brand: ConsentBrand
}

export type ConsentStatus = {
  required: boolean
  reason: 'none' | 'never' | 'material_terms' | 'material_privacy'
  policy: LegalPolicy
  current: {
    termsVersion: string | null
    privacyVersion: string | null
    consentedAt: string | null
    uiLanguage: ConsentUiLanguage | null
  }
}
