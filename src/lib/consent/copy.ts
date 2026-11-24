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
    'We updated the Terms of Use and Privacy Policy. Misaeng now keeps its own usage analytics — which screens, posts, companies, and job postings you open, searches, and similar activity — to see how the service is used and improve it; message content, photos, and verification documents are never recorded, nothing is shared with advertising or analytics companies, and raw records are kept up to 13 months. Parents can now link with a child by email (the child must accept) and pay for the child’s Premium: the parent is the payer, the subscription renews automatically until canceled, refunds go to the parent, and unlinking stops renewal. A linked parent sees only the child’s nickname and Premium status. Android purchases through Google Play are now covered.',
  summaryKo:
    '이용약관과 개인정보처리방침이 바뀌었어요. 서비스가 어떻게 쓰이는지 보고 개선하기 위해 미생이 직접 이용 기록(연 화면, 본 게시물·회사·채용 공고, 검색 등)을 수집해요. 메시지 내용, 사진, 인증 서류는 기록하지 않고, 광고·분석 업체와 공유하지 않으며, 원본 기록은 최대 13개월 보관해요. 이제 학부모가 이메일로 자녀와 연결(자녀가 수락해야 연결)하고 자녀의 프리미엄을 결제할 수 있어요. 결제자는 학부모이며, 해지할 때까지 자동 갱신되고, 환불은 학부모에게, 연결을 끊으면 갱신이 멈춰요. 연결된 학부모는 자녀의 닉네임과 프리미엄 상태만 볼 수 있어요. Google Play를 통한 Android 결제 내용도 추가했어요.',
  publishedAt: '2026-11-24T00:00:00.000Z',
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
