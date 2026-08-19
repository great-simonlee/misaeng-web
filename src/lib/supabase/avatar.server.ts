import { lookup } from 'node:dns/promises'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

export function isSupabaseStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

export function getSupabaseProjectHost() {
  const url = getSupabaseUrl()
  if (!url) return null

  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export async function assertSupabaseReachable() {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()

  if (!url || !secretKey) {
    throw new Error(
      'Supabase 스토리지 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않아요. 예: https://your-project.supabase.co',
    )
  }

  try {
    await lookup(hostname)
  } catch {
    throw new Error(
      `Supabase 프로젝트(${hostname})에 연결할 수 없어요. Dashboard → Project Settings → API에서 Project URL을 확인하고 .env.local을 업데이트해 주세요.`,
    )
  }

  try {
    await fetch(`${url}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error)

    if (message.includes('fetch failed') || message.includes('enotfound')) {
      throw new Error(
        `Supabase(${hostname})에 연결하지 못했어요. Project URL·API 키·네트워크를 확인해 주세요.`,
      )
    }

    throw error
  }
}

export async function uploadAvatarToSupabase(args: {
  uid: string
  file: File
  bucket: string
}): Promise<string> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()

  if (!url || !secretKey) {
    throw new Error(
      'Supabase 스토리지 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  await assertSupabaseReachable()

  const ext = args.file.name.includes('.')
    ? args.file.name.split('.').pop()
    : 'jpg'
  const filePath = `${args.uid}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await args.file.arrayBuffer())
  const contentType = args.file.type || 'application/octet-stream'

  const uploadResponse = await fetch(
    `${url}/storage/v1/object/${args.bucket}/${filePath}`,
    {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(30000),
    },
  )

  if (!uploadResponse.ok) {
    const payload = (await uploadResponse.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    const detail =
      payload?.message ||
      payload?.error ||
      `HTTP ${uploadResponse.status}`

    if (uploadResponse.status === 404) {
      throw new Error(
        `Supabase 버킷 "${args.bucket}"을 찾을 수 없어요. Storage에서 public 버킷을 만들어 주세요.`,
      )
    }

    throw new Error(`스토리지 업로드 실패: ${detail}`)
  }

  return `${url}/storage/v1/object/public/${args.bucket}/${filePath}`
}

export async function getLatestSupabaseAvatarUrl(args: {
  uid: string
  bucket: string
}): Promise<string | null> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()

  if (!url || !secretKey) return null

  const listResponse = await fetch(
    `${url}/storage/v1/object/list/${args.bucket}`,
    {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: `${args.uid}/`,
        limit: 20,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      }),
      signal: AbortSignal.timeout(8000),
    },
  )

  if (!listResponse.ok) return null

  const items = (await listResponse.json().catch(() => null)) as
    | Array<{ name?: string }>
    | null

  const latest = items?.find((item) => typeof item.name === 'string')
  if (!latest?.name) return null

  return `${url}/storage/v1/object/public/${args.bucket}/${args.uid}/${latest.name}`
}
