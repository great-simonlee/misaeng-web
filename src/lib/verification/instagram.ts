/**
 * 인스타그램 DM 인증 — 사용자가 받은 코드를 미생 공식 계정(@misaeng.ny)에 DM으로 보내고, 운영자가 ERP에서 확인해 승인한다.
 * 아이디는 본인과 운영자만 본다. 다른 사람에게는 "인스타 인증" 배지만 보인다.
 * 요청 JSON 형식은 ellieo-erp src/app/api/misaeng-admin/instagram 과 맞춘다.
 */

export const MISAENG_INSTAGRAM_HANDLE = 'misaeng.ny'
/** DM 대화창을 바로 여는 링크 (앱은 인스타그램 앱, 데스크톱은 웹 DM) */
export const MISAENG_INSTAGRAM_DM_URL = `https://ig.me/m/${MISAENG_INSTAGRAM_HANDLE}`

export const INSTAGRAM_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** 하루에 새로 받을 수 있는 코드 수 */
export const INSTAGRAM_REQUESTS_PER_DAY = 3

export type InstagramVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type InstagramRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export const INSTAGRAM_REJECT_REASON_CODES = ['noMessage', 'wrongAccount', 'codeMismatch', 'other'] as const

/** "@Misaeng.NY " → "misaeng.ny". 인스타그램 아이디 규칙(영문·숫자·.·_, 30자)에 맞지 않으면 null */
export function normalizeInstagramHandle(value: unknown): string | null {
  const handle = String(value ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null
  if (handle.startsWith('.') || handle.endsWith('.') || handle.includes('..')) return null
  return handle
}

/** 운영자가 DM에서 찾기 쉬운 "MS-" + 5자 (헷갈리는 0/O/1/I 제외) */
export function createInstagramCode(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i += 1) code += alphabet[Math.floor(random() * alphabet.length)]
  return `MS-${code}`
}

/** 본인 화면(웹 마이페이지·앱)에 내려 주는 인스타그램 인증 상태 */
export type InstagramVerificationState = {
  status: InstagramVerificationStatus
  /** 인증된 아이디 (approved), 아니면 진행 중·반려된 요청의 아이디 */
  handle: string | null
  /** pending일 때만 */
  code: string | null
  expiresAt: number | null
  sentAt: number | null
  expired: boolean
  rejectReasonCode: string | null
  rejectReason: string | null
}

type InstagramFields = {
  instagramHandle?: string | null
  instagramVerified?: boolean
  instagramStatus?: InstagramVerificationStatus | null
  instagramRejectReasonCode?: string | null
  instagramRejectReason?: string | null
  instagramPendingHandle?: string | null
  instagramPendingCode?: string | null
  instagramPendingExpiresAt?: number | null
  instagramPendingSentAt?: number | null
}

export function instagramStateFromProfile(
  profile: InstagramFields | null | undefined,
  now = Date.now(),
): InstagramVerificationState {
  const status: InstagramVerificationStatus =
    profile?.instagramStatus === 'pending' ||
    profile?.instagramStatus === 'approved' ||
    profile?.instagramStatus === 'rejected'
      ? profile.instagramStatus
      : profile?.instagramVerified
        ? 'approved'
        : 'none'
  const pending = status === 'pending'
  const expiresAt = pending ? (profile?.instagramPendingExpiresAt ?? null) : null
  return {
    status,
    handle: pending ? (profile?.instagramPendingHandle ?? null) : (profile?.instagramHandle ?? null),
    code: pending ? (profile?.instagramPendingCode ?? null) : null,
    expiresAt,
    sentAt: pending ? (profile?.instagramPendingSentAt ?? null) : null,
    expired: Boolean(expiresAt && expiresAt < now),
    rejectReasonCode: status === 'rejected' ? (profile?.instagramRejectReasonCode ?? null) : null,
    rejectReason: status === 'rejected' ? (profile?.instagramRejectReason ?? null) : null,
  }
}
