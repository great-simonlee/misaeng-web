import {
  DEFAULT_PRIVACY_VERSION,
  DEFAULT_TERMS_VERSION,
  detectConsentLocale,
  isConsentUiLanguage,
} from '@lib/consent/copy'
import type { ConsentMethod, ConsentUiLanguage } from '@lib/consent/types'
import { getAcceptLanguage, getClientIp, getClientUserAgent } from '@lib/consent/requestMeta'
import {
  appendConsentLog,
  bilingualError,
  getLegalPolicy,
  isLegalConsentStorageConfigured,
} from '@lib/supabase/legalConsent.server'
import { upsertSupabaseProfile } from '@lib/supabase/profile.server'
import type { Translate } from '@lib/i18n/translate'

export function isTruthyConsent(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/** t는 `getRequestT(request, 'api')` — 넘기면 error 필드를 요청 언어로 채운다 */
export function consentRejectedResponse(t?: Translate) {
  return bilingualError(
    'Please agree to the Terms to continue.',
    '약관에 동의해 주세요.',
    t?.('consent.termsRequired'),
  )
}

export async function assertAcceptedCurrentPolicy(input: {
  acceptedTerms: unknown
  termsVersion?: unknown
  privacyVersion?: unknown
  t?: Translate
}) {
  if (!isLegalConsentStorageConfigured()) {
    return {
      ok: false as const,
      status: 503,
      body: bilingualError(
        'Consent storage is not configured.',
        '동의 기록 저장소가 설정되지 않았습니다.',
        input.t?.('consent.storageNotConfigured'),
      ),
    }
  }

  if (!isTruthyConsent(input.acceptedTerms)) {
    return {
      ok: false as const,
      status: 400,
      body: consentRejectedResponse(input.t),
    }
  }

  const policy = await getLegalPolicy()
  const termsVersion = String(input.termsVersion || '').trim() || DEFAULT_TERMS_VERSION
  const privacyVersion =
    String(input.privacyVersion || '').trim() || DEFAULT_PRIVACY_VERSION

  if (
    termsVersion !== policy.termsVersion ||
    privacyVersion !== policy.privacyVersion
  ) {
    return {
      ok: false as const,
      status: 400,
      body: bilingualError(
        'The Terms or Privacy Policy version is out of date. Please refresh and try again.',
        '약관 또는 개인정보처리방침 버전이 변경되었습니다. 새로고침 후 다시 동의해 주세요.',
        input.t?.('consent.policyOutdated'),
      ),
    }
  }

  return { ok: true as const, policy, termsVersion, privacyVersion }
}

export async function persistConsentRecord(input: {
  request: Request
  userId: string
  email?: string | null
  acceptedTerms: unknown
  termsVersion?: unknown
  privacyVersion?: unknown
  uiLanguage?: unknown
  method: ConsentMethod
  t?: Translate
}) {
  const checked = await assertAcceptedCurrentPolicy(input)
  if (!checked.ok) return checked

  const uiLanguage: ConsentUiLanguage = isConsentUiLanguage(input.uiLanguage)
    ? input.uiLanguage
    : detectConsentLocale(getAcceptLanguage(input.request))

  if (!isLegalConsentStorageConfigured()) {
    return {
      ok: false as const,
      status: 503,
      body: bilingualError(
        'Consent storage is not configured.',
        '동의 기록 저장소가 설정되지 않았습니다.',
        input.t?.('consent.storageNotConfigured'),
      ),
    }
  }

  const log = await appendConsentLog({
    userId: input.userId,
    email: input.email,
    termsVersion: checked.termsVersion,
    privacyVersion: checked.privacyVersion,
    ipAddress: getClientIp(input.request),
    userAgent: getClientUserAgent(input.request),
    consentMethod: input.method,
    uiLanguage,
  })

  await upsertSupabaseProfile(input.userId, {
    email: input.email,
    termsVersion: log.terms_version,
    privacyVersion: log.privacy_version,
    consentedAt: log.consented_at,
    consentUiLanguage: log.ui_language,
  }).catch(() => null)

  return { ok: true as const, log }
}
