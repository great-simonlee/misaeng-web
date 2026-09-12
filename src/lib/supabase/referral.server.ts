import { isSupabaseStorageConfigured } from '@lib/supabase/avatar.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'

export type ReferralIndexRecord = {
  code: string
  uid: string
  createdAt: number
  /** 이 코드를 사용한 사용자 uid (최대 7명) */
  referredUids: string[]
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function referralObjectPath(code: string) {
  return `community-referrals/${code}.json`
}

export function isReferralStorageConfigured() {
  return isSupabaseStorageConfigured()
}

export async function getReferralIndex(
  code: string,
): Promise<ReferralIndexRecord | null> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()
  if (!url || !secretKey || !code) return null

  const bucket = getSupabaseAvatarBucket()
  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${referralObjectPath(code)}`,
    {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(8000),
    },
  )

  if (!response.ok) return null
  const data = (await response.json().catch(() => null)) as
    | ReferralIndexRecord
    | null
  if (!data || typeof data !== 'object') return null
  const uid = String(data.uid || '').trim()
  const nextCode = String(data.code || '').trim()
  if (!uid || !nextCode) return null
  const referredUids = Array.isArray(data.referredUids)
    ? data.referredUids
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : []

  return {
    code: nextCode,
    uid,
    createdAt: Number(data.createdAt) || Date.now(),
    referredUids: [...new Set(referredUids)],
  }
}

export async function saveReferralIndex(
  record: ReferralIndexRecord,
): Promise<ReferralIndexRecord> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()
  if (!url || !secretKey) {
    throw new Error('추천 코드 저장소 설정이 필요해요.')
  }

  const bucket = getSupabaseAvatarBucket()
  const body = Buffer.from(JSON.stringify(record), 'utf8')
  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${referralObjectPath(record.code)}`,
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
    throw new Error('추천 코드 저장에 실패했어요.')
  }
  return record
}
