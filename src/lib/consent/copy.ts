import { NYC_PRIVACY_POLICY } from '@lib/constants/nycPrivacyPolicy'
import { NYC_TERMS_OF_USE } from '@lib/constants/nycTermsOfUse'

import en from './en.json'
import ko from './ko.json'
import type { ConsentUiLanguage, LegalPolicy } from './types'

export const CONSENT_COPY = { en, ko } as const

export const DEFAULT_TERMS_VERSION = NYC_TERMS_OF_USE.version
export const DEFAULT_PRIVACY_VERSION = NYC_PRIVACY_POLICY.version

export const TERMS_HREF = '/nyc/terms-of-use'
export const PRIVACY_HREF = '/nyc/privacy-policy'
export const TERMS_ARBITRATION_HREF = '/nyc/terms-of-use#governing-law'
export const ARBITRATION_OPT_OUT_EMAIL = 'info@misaeng.com'

export const DEFAULT_POLICY: LegalPolicy = {
  termsVersion: DEFAULT_TERMS_VERSION,
  privacyVersion: DEFAULT_PRIVACY_VERSION,
  termsChangeType: 'material',
  privacyChangeType: 'material',
  summaryEn:
    'Please review the Terms of Use and Privacy Policy. These Terms include a binding individual arbitration agreement and class-action waiver.',
  summaryKo:
    '이용약관 및 개인정보처리방침을 확인해 주세요. 본 약관에는 구속력 있는 개별 중재 합의 및 집단소송 포기 조항이 포함되어 있습니다.',
  publishedAt: '2026-08-30T00:00:00.000Z',
  publishedBy: 'system',
}

export function copyFor(locale: ConsentUiLanguage) {
  return CONSENT_COPY[locale]
}

export function isConsentUiLanguage(value: unknown): value is ConsentUiLanguage {
  return value === 'en' || value === 'ko'
}

export function detectConsentLocale(
  language?: string | null,
): ConsentUiLanguage {
  const raw = String(language || '').trim().toLowerCase()
  if (raw.startsWith('ko')) return 'ko'
  return 'en'
}
