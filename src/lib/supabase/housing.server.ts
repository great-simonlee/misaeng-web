import { normalizeHousingListing } from '@lib/housing/normalize'
import type { HousingListing } from '@/types/nyc'

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

export function isHousingStorageConfigured() {
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
      signal: init.signal ?? AbortSignal.timeout(12000),
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

async function fetchListingJson(bucket: string, objectPath: string) {
  const res = await storageFetch(`/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return normalizeHousingListing(data)
}

export async function listStoredHousingListings(): Promise<HousingListing[]> {
  if (!isHousingStorageConfigured()) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: 'listings/',
      limit: 1000,
      offset: 0,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
  })
  if (!res?.ok) return []

  const items = (await res.json().catch(() => null)) as
    | Array<{ name?: string }>
    | null
  const names = (items || [])
    .map((item) => String(item?.name || '').trim())
    .filter((name) => name.endsWith('.json'))

  const listings = (
    await Promise.all(
      names.map((name) => {
        const objectPath = name.startsWith('listings/')
          ? name
          : `listings/${name}`
        return fetchListingJson(bucket, objectPath)
      }),
    )
  ).filter((listing): listing is HousingListing => Boolean(listing))

  return listings
    .filter((listing) => listing.status === 'open')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function getStoredHousingListing(
  id: string,
): Promise<HousingListing | null> {
  if (!isHousingStorageConfigured()) return null
  const listingId = String(id || '').trim()
  if (!listingId) return null
  const bucket = await resolveBucket()
  return fetchListingJson(bucket, `listings/${listingId}.json`)
}
