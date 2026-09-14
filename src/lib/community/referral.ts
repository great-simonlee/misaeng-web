import type { CityId } from '@lib/constants/cities'

/** 추천인 코드 — 클라이언트 유틸 */

export const REFERRAL_QUERY_KEY = 'ref'
export const REFERRAL_STORAGE_KEY = 'misaeng.nyc.referralCode'
export const REFERRAL_CODE_LENGTH = 8
export { COMMUNITY_CREDIT_REFERRAL_MAX as REFERRAL_MAX_USES } from '@lib/constants/communityCredit'
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeReferralCode(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function isValidReferralCode(code: string): boolean {
  const next = normalizeReferralCode(code)
  return next.length === REFERRAL_CODE_LENGTH
}

export function createReferralCode(): string {
  let out = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * REFERRAL_ALPHABET.length)
    out += REFERRAL_ALPHABET[index]
  }
  return out
}

export function persistReferralCode(code: string) {
  if (typeof window === 'undefined') return
  const next = normalizeReferralCode(code)
  if (!isValidReferralCode(next)) return
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, next)
}

export function readPersistedReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const next = normalizeReferralCode(
      window.localStorage.getItem(REFERRAL_STORAGE_KEY),
    )
    return isValidReferralCode(next) ? next : null
  } catch {
    return null
  }
}

export function clearPersistedReferralCode() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
}

export function captureReferralFromLocation() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const code = params.get(REFERRAL_QUERY_KEY)
  if (code) persistReferralCode(code)
}

export function buildReferralShareUrl(
  origin: string,
  code: string,
  city: CityId = 'nyc',
): string {
  const next = normalizeReferralCode(code)
  const base = origin.replace(/\/$/, '')
  return `${base}/${city}?${REFERRAL_QUERY_KEY}=${encodeURIComponent(next)}`
}

export async function bindReferralCodeRequest(code: string) {
  const response = await fetch('/api/community/referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  })
  const data = (await response.json().catch(() => null)) as {
    error?: string
    referredByCode?: string | null
    usedCount?: number
  } | null
  if (!response.ok) {
    throw new Error(data?.error || '추천인 연결에 실패했어요')
  }
  return data
}

export async function bindPersistedReferralIfNeeded() {
  const code = readPersistedReferralCode()
  if (!code) return
  try {
    await bindReferralCodeRequest(code)
    clearPersistedReferralCode()
  } catch {
    // 이미 연결됐거나 본인 코드면 가입을 막지 않음
  }
}
