import { lookup } from 'node:dns/promises'

import { ApiMessageError } from '@lib/i18n/apiError'

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
    throw new ApiMessageError(
      'Supabase storage is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.storageNotConfigured',
    )
  }

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new ApiMessageError(
      'NEXT_PUBLIC_SUPABASE_URL is not a valid URL (e.g. https://your-project.supabase.co).',
      'common.supabaseUrlInvalid',
    )
  }

  try {
    await lookup(hostname)
  } catch {
    throw new ApiMessageError(
      `Cannot resolve Supabase project host (${hostname}).`,
      'common.supabaseHostUnreachable',
      { hostname },
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
      throw new ApiMessageError(
        `Failed to connect to Supabase (${hostname}).`,
        'common.supabaseConnectFailed',
        { hostname },
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
    throw new ApiMessageError(
      'Supabase storage is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.storageNotConfigured',
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
      throw new ApiMessageError(
        `Supabase bucket "${args.bucket}" not found.`,
        'upload.avatarBucketMissing',
        { bucket: args.bucket },
      )
    }

    throw new ApiMessageError(`Storage upload failed: ${detail}`, 'upload.storageUploadFailed', {
      detail,
    })
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
