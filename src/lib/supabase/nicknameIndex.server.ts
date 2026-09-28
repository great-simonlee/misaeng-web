import { getSupabaseAvatarBucket } from '@lib/supabase/server'

/**
 * 닉네임 중복 방지 색인.
 * 프로필은 `{uid}/profile.json`에 흩어져 있어서, 소문자 닉네임 → uid 매핑을
 * `community-nicknames/{key}.json`에 따로 둔다. (대소문자 구분 없이 1인 1닉네임)
 */

export type NicknameIndexRecord = {
  nickname: string
  uid: string
  createdAt: number
}

const INDEX_PREFIX = 'community-nicknames'
/** 기존 프로필 닉네임을 색인에 한 번 채웠는지 표시 */
const BACKFILL_MARKER_PATH = `${INDEX_PREFIX}/_backfill-v1.json`
const LIST_PAGE_SIZE = 1000
const BACKFILL_CONCURRENCY = 8

/** 멤버 닉네임 규칙(영문·점)을 통과한 소문자 키만 색인 대상 */
const INDEX_KEY_PATTERN = /^[a-z.]+$/

export class NicknameTakenError extends Error {
  constructor() {
    super('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.')
    this.name = 'NicknameTakenError'
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

export function toNicknameKey(value: string | null | undefined): string | null {
  const key = String(value || '').trim().toLowerCase()
  return INDEX_KEY_PATTERN.test(key) ? key : null
}

function indexObjectPath(key: string) {
  return `${INDEX_PREFIX}/${key}.json`
}

async function storageFetch(path: string, init: RequestInit & { timeoutMs?: number }) {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()
  if (!url || !secretKey) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }
  const { timeoutMs = 8000, headers, ...rest } = init
  return fetch(`${url}${path}`, {
    ...rest,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
}

async function readIndex(key: string): Promise<NicknameIndexRecord | null> {
  const bucket = getSupabaseAvatarBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${indexObjectPath(key)}`,
    { method: 'GET' },
  )
  if (res.status === 404 || res.status === 400) return null
  if (!res.ok) {
    throw new Error(`닉네임 확인에 실패했어요. (HTTP ${res.status})`)
  }
  const data = (await res.json().catch(() => null)) as
    | Partial<NicknameIndexRecord>
    | null
  const uid = String(data?.uid || '').trim()
  if (!uid) return null
  return {
    nickname: String(data?.nickname || key),
    uid,
    createdAt: Number(data?.createdAt) || 0,
  }
}

/** 덮어쓰지 않고 새로 만든다. 이미 있으면 false (선점 경합 방지) */
async function createIndexIfAbsent(
  key: string,
  record: NicknameIndexRecord,
): Promise<boolean> {
  const bucket = getSupabaseAvatarBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${indexObjectPath(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify(record), 'utf8'),
      timeoutMs: 15000,
    },
  )
  return res.ok
}

async function deleteIndex(key: string) {
  const bucket = getSupabaseAvatarBucket()
  await storageFetch(`/storage/v1/object/${bucket}/${indexObjectPath(key)}`, {
    method: 'DELETE',
  })
}

async function listBucketFolders(): Promise<string[]> {
  const bucket = getSupabaseAvatarBucket()
  const folders: string[] = []
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: LIST_PAGE_SIZE, offset }),
      timeoutMs: 15000,
    })
    if (!res.ok) throw new Error(`프로필 목록 조회 실패 (HTTP ${res.status})`)
    const items = (await res.json().catch(() => null)) as
      | Array<{ name?: string; id?: string | null }>
      | null
    if (!items?.length) break
    for (const item of items) {
      // 폴더는 id가 null로 내려온다.
      if (item.id == null && item.name && item.name !== INDEX_PREFIX) {
        folders.push(item.name)
      }
    }
    if (items.length < LIST_PAGE_SIZE) break
  }
  return folders
}

async function readProfileNickname(uid: string): Promise<string | null> {
  const bucket = getSupabaseAvatarBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${uid}/profile.json`,
    { method: 'GET' },
  )
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as
    | { nickname?: unknown }
    | null
  return typeof data?.nickname === 'string' ? data.nickname : null
}

async function runBackfill() {
  const bucket = getSupabaseAvatarBucket()
  const marker = await storageFetch(
    `/storage/v1/object/${bucket}/${BACKFILL_MARKER_PATH}`,
    { method: 'GET' },
  )
  if (marker.ok) return

  const uids = await listBucketFolders()
  for (let i = 0; i < uids.length; i += BACKFILL_CONCURRENCY) {
    await Promise.all(
      uids.slice(i, i + BACKFILL_CONCURRENCY).map(async (uid) => {
        const nickname = await readProfileNickname(uid)
        const key = toNicknameKey(nickname)
        if (!nickname || !key) return
        await createIndexIfAbsent(key, {
          nickname: nickname.trim(),
          uid,
          createdAt: Date.now(),
        })
      }),
    )
  }

  await storageFetch(`/storage/v1/object/${bucket}/${BACKFILL_MARKER_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: Buffer.from(
      JSON.stringify({ completedAt: Date.now(), count: uids.length }),
      'utf8',
    ),
  })
}

let backfillPromise: Promise<void> | null = null

/** 색인 도입 전에 저장된 닉네임을 한 번만 채운다. 실패하면 다음 요청에서 재시도 */
function ensureBackfilled(): Promise<void> {
  if (!backfillPromise) {
    backfillPromise = runBackfill().catch((error) => {
      backfillPromise = null
      throw error
    })
  }
  return backfillPromise
}

/** 다른 사용자가 이미 쓰고 있는 닉네임이면 true */
export async function isNicknameTakenByOther(
  nickname: string,
  uid?: string | null,
): Promise<boolean> {
  const key = toNicknameKey(nickname)
  if (!key) return false
  await ensureBackfilled()
  const owner = await readIndex(key)
  return Boolean(owner && owner.uid !== uid)
}

/**
 * 닉네임을 uid 앞으로 선점한다. 다른 사용자가 쓰고 있으면 NicknameTakenError.
 * 프로필 저장이 끝난 뒤 `releaseNickname`으로 이전 닉네임을 풀어 준다.
 */
export async function claimNickname(uid: string, nickname: string) {
  const key = toNicknameKey(nickname)
  if (!key) return
  await ensureBackfilled()

  const owner = await readIndex(key)
  if (owner) {
    if (owner.uid === uid) return
    throw new NicknameTakenError()
  }

  const created = await createIndexIfAbsent(key, {
    nickname: nickname.trim(),
    uid,
    createdAt: Date.now(),
  })
  if (created) return

  const winner = await readIndex(key)
  if (winner?.uid !== uid) throw new NicknameTakenError()
}

/** 이 uid가 가진 닉네임 색인만 지운다 */
export async function releaseNickname(uid: string, nickname: string | null | undefined) {
  const key = toNicknameKey(nickname)
  if (!key) return
  const owner = await readIndex(key)
  if (owner?.uid === uid) await deleteIndex(key)
}
