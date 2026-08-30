export type ConsentUiLanguage = 'en' | 'ko'

export type ConsentMethod =
  | 'signup_checkbox'
  | 'reconsent_modal'
  | 'google_signup_checkbox'

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
