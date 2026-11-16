import { NYC_PRIVACY_POLICY } from '@lib/constants/nycPrivacyPolicy'
import { NYC_TERMS_OF_USE } from '@lib/constants/nycTermsOfUse'

import { isLocale, parseLocale } from '@lib/i18n/locales'

import type { ConsentUiLanguage, LegalPolicy } from './types'

/* 화면 문구는 src/messages/{locale}/consent.json (useT('consent')) */

export const DEFAULT_TERMS_VERSION = NYC_TERMS_OF_USE.version
export const DEFAULT_PRIVACY_VERSION = NYC_PRIVACY_POLICY.version

/** 도시 경로 기준. 화면에서는 useCityPath()로 언어 접두사를 붙인다 */
export const TERMS_PATH = '/terms-of-use'
export const PRIVACY_PATH = '/privacy-policy'
export const TERMS_ARBITRATION_PATH = '/terms-of-use#governing-law'
export const ARBITRATION_OPT_OUT_EMAIL = 'info@misaeng.com'

export const DEFAULT_POLICY: LegalPolicy = {
  termsVersion: DEFAULT_TERMS_VERSION,
  privacyVersion: DEFAULT_PRIVACY_VERSION,
  termsChangeType: 'material',
  privacyChangeType: 'material',
  summaryEn:
    'We updated the Terms of Use and Privacy Policy for the Marketplace (used-goods trading) in the Misaeng app: Misaeng is not a party to trades, prohibited items, safe-trading rules, and what marketplace data we keep. These Terms include a binding individual arbitration agreement and class-action waiver.',
  summaryKo:
    '미생 앱의 중고거래에 맞춰 이용약관과 개인정보처리방침이 바뀌었어요. 회사는 거래 당사자가 아니라는 점, 거래 금지 품목, 안전거래 수칙, 중고거래 정보의 보관이 추가되었습니다. 본 약관에는 구속력 있는 개별 중재 합의 및 집단소송 포기 조항이 포함되어 있습니다.',
  publishedAt: '2026-11-15T00:00:00.000Z',
  publishedBy: 'system',
}

export function isConsentUiLanguage(value: unknown): value is ConsentUiLanguage {
  return isLocale(value)
}

export function detectConsentLocale(
  language?: string | null,
): ConsentUiLanguage {
  return parseLocale(String(language || '').split(',')[0]) ?? 'en'
}
