import { ApiMessageError } from '@lib/i18n/apiError'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return (
    process.env.SUPABASE_HOUSING_BUCKET?.trim() ||
    process.env.SUPABASE_AVATAR_BUCKET?.trim() ||
    'housing'
  )
}

export function isCommunityImageStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

const MAX_BYTES = 5 * 1024 * 1024

export async function uploadCommunityImageToSupabase(args: {
  uid: string
  file: File
}): Promise<string> {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()
  if (!url || !secretKey) {
    throw new ApiMessageError(
      'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.supabaseNotConfiguredDetail',
    )
  }

  const type = (args.file.type || '').toLowerCase()
  if (type && !ALLOWED_TYPES.has(type)) {
    throw new ApiMessageError('Unsupported image type', 'upload.imageTypeUnsupported')
  }
  if (args.file.size > MAX_BYTES) {
    throw new ApiMessageError('Image exceeds 5MB', 'upload.imageTooLarge', { max: '5MB' })
  }

  const extFromName = args.file.name.includes('.')
    ? args.file.name.split('.').pop()?.toLowerCase()
    : null
  const ext =
    extFromName && /^[a-z0-9]+$/.test(extFromName)
      ? extFromName
      : type.includes('png')
        ? 'png'
        : type.includes('webp')
          ? 'webp'
          : type.includes('gif')
            ? 'gif'
            : 'jpg'

  const bucket = getPreferredBucket()
  const filePath = `community-images/${args.uid}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await args.file.arrayBuffer())
  const contentType = type || 'application/octet-stream'

  const uploadResponse = await fetch(
    `${url}/storage/v1/object/${bucket}/${filePath}`,
    {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(45000),
    },
  )

  if (!uploadResponse.ok) {
    const payload = (await uploadResponse.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    const detail =
      payload?.message || payload?.error || `HTTP ${uploadResponse.status}`
    if (uploadResponse.status === 404) {
      throw new ApiMessageError(
        `Supabase bucket "${bucket}" not found.`,
        'upload.imageBucketMissing',
        { bucket },
      )
    }
    throw new ApiMessageError(`Image upload failed: ${detail}`, 'upload.imageUploadFailedDetail', {
      detail,
    })
  }

  return `${url}/storage/v1/object/public/${bucket}/${filePath}`
}
