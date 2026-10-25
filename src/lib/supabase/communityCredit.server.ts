import { ApiMessageError } from '@lib/i18n/apiError'
import type { CommunityCreditAccount } from '@lib/constants/communityCredit'

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
}

export function isCommunityCreditStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

function storageHeaders(contentType?: string) {
  const secretKey = getSupabaseSecretKey()
  const headers: Record<string, string> = {
    apikey: secretKey || '',
    Authorization: `Bearer ${secretKey || ''}`,
  }
  if (contentType) headers['Content-Type'] = contentType
  return headers
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return null
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
    })
  } catch {
    return null
  }
}

async function bucketExists(bucket: string) {
  const res = await storageFetch(`/storage/v1/bucket/${bucket}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  return Boolean(res?.ok)
}

async function resolveBucket() {
  const preferred = getPreferredBucket()
  if (await bucketExists(preferred)) return preferred
  if (preferred !== FALLBACK_BUCKET && (await bucketExists(FALLBACK_BUCKET))) {
    return FALLBACK_BUCKET
  }
  return preferred
}

function objectPath(uid: string) {
  return `community-credits/${uid}.json`
}

function emptyAccount(uid: string): CommunityCreditAccount {
  return {
    uid,
    balance: 0,
    entries: [],
    bonusesClaimed: [],
    backfilledAt: null,
    updatedAt: Date.now(),
  }
}

function normalizeAccount(
  uid: string,
  raw: unknown,
): CommunityCreditAccount {
  if (!raw || typeof raw !== 'object') return emptyAccount(uid)
  const data = raw as Record<string, unknown>
  const entries: CommunityCreditAccount['entries'] = []

  if (Array.isArray(data.entries)) {
    for (const item of data.entries) {
      if (!item || typeof item !== 'object') continue
      const e = item as Record<string, unknown>
      const id = String(e.id || '').trim()
      const amount = Number(e.amount)
      if (!id || !Number.isFinite(amount)) continue
      const kind = e.kind
      if (
        kind !== 'earn' &&
        kind !== 'revoke' &&
        kind !== 'spend' &&
        kind !== 'restore'
      ) {
        continue
      }
      const reasonRaw = typeof e.reason === 'string' ? e.reason : 'other'
      entries.push({
        id,
        kind,
        reason: reasonRaw as CommunityCreditAccount['entries'][number]['reason'],
        amount: Math.trunc(amount),
        label: String(e.label || '').trim() || '크레딧',
        sourceId:
          typeof e.sourceId === 'string' && e.sourceId.trim()
            ? e.sourceId.trim()
            : null,
        createdAt: Number(e.createdAt) || Date.now(),
      })
    }
  }

  const bonusesClaimed = Array.isArray(data.bonusesClaimed)
    ? data.bonusesClaimed
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : []

  const balanceFromEntries = entries.reduce((sum, item) => sum + item.amount, 0)
  const storedBalance = Number(data.balance)
  const balance = Number.isFinite(storedBalance)
    ? Math.trunc(storedBalance)
    : balanceFromEntries

  return {
    uid,
    balance,
    entries,
    bonusesClaimed,
    backfilledAt:
      typeof data.backfilledAt === 'number' && Number.isFinite(data.backfilledAt)
        ? data.backfilledAt
        : null,
    updatedAt: Number(data.updatedAt) || Date.now(),
  }
}

export async function getStoredCommunityCreditAccount(
  uid: string,
): Promise<CommunityCreditAccount> {
  const userId = String(uid || '').trim()
  if (!userId || !isCommunityCreditStorageConfigured()) {
    return emptyAccount(userId || 'unknown')
  }

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(userId)}`,
    {
      method: 'GET',
      headers: storageHeaders(),
    },
  )

  if (!res?.ok) return emptyAccount(userId)

  const data = await res.json().catch(() => null)
  return normalizeAccount(userId, data)
}

export async function saveStoredCommunityCreditAccount(
  account: CommunityCreditAccount,
): Promise<CommunityCreditAccount> {
  if (!isCommunityCreditStorageConfigured()) {
    throw new ApiMessageError(
      'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.supabaseNotConfiguredDetail',
    )
  }

  const uid = String(account.uid || '').trim()
  if (!uid) throw new ApiMessageError('Invalid user id', 'credit.invalidUser')

  const next: CommunityCreditAccount = {
    ...account,
    uid,
    balance: Math.trunc(account.balance),
    updatedAt: Date.now(),
  }

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify(next), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(uid)}`,
    {
      method: 'POST',
      headers: {
        ...storageHeaders('application/json'),
        'x-upsert': 'true',
      },
      body,
    },
  )

  if (!res?.ok) {
    const payload = (await res?.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    const detail = payload?.message || payload?.error
    if (detail) throw new Error(detail)
    throw new ApiMessageError(
      `Credit account save failed (HTTP ${res?.status ?? 'unknown'})`,
      'credit.saveFailed',
      { status: res?.status ?? 'unknown' },
    )
  }

  return next
}
