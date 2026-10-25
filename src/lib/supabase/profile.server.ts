import type { ConsentUiLanguage } from '@lib/consent/types'
import {
  assertSupabaseReachable,
  isSupabaseStorageConfigured,
} from '@lib/supabase/avatar.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { invalidateListProfile } from '@lib/supabase/listCache.server'
import { NextResponse } from 'next/server'

import { ApiMessageError } from '@lib/i18n/apiError'
import type { Translate } from '@lib/i18n/translate'

import {
  ACCOUNT_SUSPENDED_CODE,
  isAccountSuspended,
} from '@lib/community/schoolGate'

export type SupabaseProfileRecord = {
  uid: string
  email?: string | null
  nickname?: string | null
  firstName?: string | null
  lastName?: string | null
  mbti?: string | null
  photoURL?: string | null
  gender?: string | null
  occupationType?: string | null
  schoolEmail?: string | null
  schoolEmailVerified?: boolean
  verifiedSchoolId?: string | null
  verifiedSchoolName?: string | null
  workEmail?: string | null
  workEmailVerified?: boolean
  workplaceCompanyName?: string | null
  workplaceStatus?: 'none' | 'pending' | 'approved' | 'rejected' | null
  workplaceRequestId?: string | null
  workplaceRejectReason?: string | null
  workplaceReviewedAt?: number | null
  workplaceReviewedByEmail?: string | null
  phone?: string | null
  phoneVerified?: boolean
  termsVersion?: string | null
  privacyVersion?: string | null
  consentedAt?: string | null
  consentUiLanguage?: ConsentUiLanguage | null
  writeGuidelinesVersion?: string | null
  writeGuidelinesConsentedAt?: string | null
  writeGuidelinesSource?:
    | 'status'
    | 'job-review'
    | 'roommate'
    | 'anonymous'
    | null
  status?: 'active' | 'suspended' | null
  /** 선호 언어 (BCP 47, src/lib/i18n/locales.ts) */
  preferredLocale?: string | null
  /** 공개 추천 코드 (8자) */
  referralCode?: string | null
  /** 연결된 추천인 uid */
  referredByUid?: string | null
  referredByCode?: string | null
  referredAt?: number | null
  updatedAt?: number
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function profileObjectPath(uid: string) {
  return `${uid}/profile.json`
}

export function isSupabaseProfileConfigured() {
  return isSupabaseStorageConfigured()
}

export async function getSupabaseProfile(
  uid: string,
): Promise<SupabaseProfileRecord | null> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()
  if (!url || !secretKey) return null

  const bucket = getSupabaseAvatarBucket()
  const objectPath = profileObjectPath(uid)

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(8000),
    },
  )

  if (response.status === 404) return null
  if (!response.ok) return null

  const data = (await response.json().catch(() => null)) as
    | SupabaseProfileRecord
    | null

  if (!data || typeof data !== 'object') return null
  return { ...data, uid }
}

export async function upsertSupabaseProfile(
  uid: string,
  patch: Partial<Omit<SupabaseProfileRecord, 'uid'>>,
): Promise<SupabaseProfileRecord> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()

  if (!url || !secretKey) {
    throw new ApiMessageError(
      'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.supabaseNotConfiguredDetail',
    )
  }

  await assertSupabaseReachable()

  const existing = (await getSupabaseProfile(uid)) ?? { uid }
  const next: SupabaseProfileRecord = {
    ...existing,
    ...patch,
    uid,
    updatedAt: Date.now(),
  }

  const bucket = getSupabaseAvatarBucket()
  const objectPath = profileObjectPath(uid)
  const body = Buffer.from(JSON.stringify(next), 'utf8')

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body,
      signal: AbortSignal.timeout(15000),
    },
  )

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    const detail =
      payload?.message ||
      payload?.error ||
      `HTTP ${response.status}`

    throw new ApiMessageError(`Profile save failed: ${detail}`, 'profile.saveFailedDetail', { detail })
  }

  invalidateListProfile(uid)
  return next
}

/** t는 `getRequestT(request, 'api')` — 정지 안내를 요청 언어로 보낸다 */
export async function accountSuspendedResponse(uid: string, t: Translate) {
  const profile = await getSupabaseProfile(uid)
  if (!isAccountSuspended(profile)) return null
  return NextResponse.json(
    {
      error: t('common.accountSuspended'),
      code: ACCOUNT_SUSPENDED_CODE,
    },
    { status: 403 },
  )
}
