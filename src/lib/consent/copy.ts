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
    'We updated the Terms of Use and Privacy Policy for Misaeng Premium (paid subscription: automatic renewal, free trial, cancellation, refunds, and payments through Stripe and Apple), Misaeng Points, Coffee Chats and Career Questions, and in-app account deletion. We also list the service providers we use, explain transfers to the United States (including for users in Korea), and set the minimum age at 18. These Terms include a binding individual arbitration agreement and class-action waiver.',
  summaryKo:
    '미생 Premium(유료 구독: 자동 갱신, 무료 체험, 해지, 환불, Stripe·Apple 결제), 미생 포인트, 커피챗·커리어 질문, 앱에서 바로 하는 회원 탈퇴에 맞춰 이용약관과 개인정보처리방침이 바뀌었어요. 이용하는 서비스 제공 업체 목록과 미국으로의 국외 이전(한국 이용자 안내 포함)을 추가했고, 이용 연령을 만 18세 이상으로 정했습니다. 본 약관에는 구속력 있는 개별 중재 합의 및 집단소송 포기 조항이 포함되어 있습니다.',
  publishedAt: '2026-11-23T00:00:00.000Z',
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
