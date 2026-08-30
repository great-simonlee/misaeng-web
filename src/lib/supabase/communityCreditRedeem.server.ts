import type {
  CoffeeChatAcademicLevelId,
  CoffeeChatMatchFocusId,
  CoffeeChatMeetingFormatId,
  LawyerConsultCategoryId,
} from '@lib/constants/creditRedeemRequest'

export type CreditRedeemRequestType = 'coffee-chat' | 'lawyer-consult'

export type CreditRedeemRequestStatus = 'pending' | 'matched' | 'rejected' | 'cancelled'

type CreditRedeemRequestBase = {
  id: string
  type: CreditRedeemRequestType
  cost: number
  status: CreditRedeemRequestStatus
  authorUid: string
  authorEmail: string
  authorNickname: string | null
  createdAt: number
  updatedAt: number
}

export type CoffeeChatRedeemRequest = CreditRedeemRequestBase & {
  type: 'coffee-chat'
  matchFocus: CoffeeChatMatchFocusId
  field: string
  company: string | null
  academicLevel: CoffeeChatAcademicLevelId | null
  meetingFormat: CoffeeChatMeetingFormatId
  detail: string
}

export type LawyerConsultRedeemRequest = CreditRedeemRequestBase & {
  type: 'lawyer-consult'
  categories: LawyerConsultCategoryId[]
  detail: string
}

export type CommunityCreditRedeemRequest =
  | CoffeeChatRedeemRequest
  | LawyerConsultRedeemRequest

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

export function isCreditRedeemStorageConfigured() {
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

function objectPath(id: string) {
  return `community-credit-redeems/${id}.json`
}

function normalizeRequest(raw: unknown): CommunityCreditRedeemRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const authorUid = String(data.authorUid || '').trim()
  const type = data.type
  const status = data.status
  if (!id || !authorUid) return null
  if (type !== 'coffee-chat' && type !== 'lawyer-consult') return null
  if (
    status !== 'pending' &&
    status !== 'matched' &&
    status !== 'rejected' &&
    status !== 'cancelled'
  ) {
    return null
  }

  const base = {
    id,
    cost: Math.trunc(Number(data.cost) || 0),
    status: status as CreditRedeemRequestStatus,
    authorUid,
    authorEmail: String(data.authorEmail || '').trim(),
    authorNickname:
      typeof data.authorNickname === 'string' && data.authorNickname.trim()
        ? data.authorNickname.trim()
        : null,
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
  }

  if (type === 'coffee-chat') {
    const academicRaw =
      typeof data.academicLevel === 'string' && data.academicLevel.trim()
        ? data.academicLevel.trim()
        : null
    return {
      ...base,
      type: 'coffee-chat' as const,
      matchFocus: data.matchFocus as CoffeeChatMatchFocusId,
      field: String(data.field || '').trim(),
      company:
        typeof data.company === 'string' && data.company.trim()
          ? data.company.trim()
          : null,
      academicLevel: (academicRaw as CoffeeChatAcademicLevelId | null) || null,
      meetingFormat: data.meetingFormat as CoffeeChatMeetingFormatId,
      detail: String(data.detail || '').trim(),
    }
  }

  const categories = Array.isArray(data.categories)
    ? data.categories
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : []

  return {
    ...base,
    type: 'lawyer-consult' as const,
    categories: categories as LawyerConsultCategoryId[],
    detail: String(data.detail || '').trim(),
  }
}

export async function saveStoredCreditRedeemRequest(
  request: CommunityCreditRedeemRequest,
): Promise<CommunityCreditRedeemRequest> {
  if (!isCreditRedeemStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify(request), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(request.id)}`,
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
    throw new Error(
      payload?.message ||
        payload?.error ||
        `신청 저장 실패 (HTTP ${res?.status ?? 'unknown'})`,
    )
  }

  return request
}

export async function listStoredCreditRedeemRequests(args?: {
  authorUid?: string
  type?: CreditRedeemRequestType
  limit?: number
}): Promise<CommunityCreditRedeemRequest[]> {
  if (!isCreditRedeemStorageConfigured()) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/list/${bucket}`,
    {
      method: 'POST',
      headers: storageHeaders('application/json'),
      body: JSON.stringify({
        prefix: 'community-credit-redeems/',
        limit: Math.min(Math.max(args?.limit ?? 100, 1), 200),
        offset: 0,
      }),
    },
  )

  if (!res?.ok) return []
  const listed = (await res.json().catch(() => null)) as
    | { name?: string }[]
    | null
  if (!Array.isArray(listed)) return []

  const requests: CommunityCreditRedeemRequest[] = []
  for (const item of listed) {
    const name = String(item.name || '').trim()
    if (!name.endsWith('.json')) continue
    const objectRes = await storageFetch(
      `/storage/v1/object/${bucket}/community-credit-redeems/${name}`,
      {
        method: 'GET',
        headers: storageHeaders(),
      },
    )
    if (!objectRes?.ok) continue
    const raw = await objectRes.json().catch(() => null)
    const normalized = normalizeRequest(raw)
    if (!normalized) continue
    if (args?.authorUid && normalized.authorUid !== args.authorUid) continue
    if (args?.type && normalized.type !== args.type) continue
    requests.push(normalized)
  }

  return requests.sort((a, b) => b.createdAt - a.createdAt)
}
