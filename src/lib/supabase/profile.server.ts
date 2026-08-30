import {
  assertSupabaseReachable,
  isSupabaseStorageConfigured,
} from '@lib/supabase/avatar.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { NextResponse } from 'next/server'

import {
  ACCOUNT_SUSPENDED_CODE,
  ACCOUNT_SUSPENDED_MESSAGE,
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
  phone?: string | null
  phoneVerified?: boolean
  termsVersion?: string | null
  privacyVersion?: string | null
  consentedAt?: string | null
  consentUiLanguage?: 'en' | 'ko' | null
  status?: 'active' | 'suspended' | null
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
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
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

    throw new Error(`프로필 저장 실패: ${detail}`)
  }

  return next
}

export async function accountSuspendedResponse(uid: string) {
  const profile = await getSupabaseProfile(uid)
  if (!isAccountSuspended(profile)) return null
  return NextResponse.json(
    { error: ACCOUNT_SUSPENDED_MESSAGE, code: ACCOUNT_SUSPENDED_CODE },
    { status: 403 },
  )
}
