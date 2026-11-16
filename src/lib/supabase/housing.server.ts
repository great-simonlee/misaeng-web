import {
  housingListingMatchesCity,
  type CityId,
} from '@lib/constants/cities'
import { normalizeHousingListing } from '@lib/housing/normalize'
import { TtlCache } from '@lib/supabase/listCache.server'
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

/** Storage object list page size (its maximum) */
const STORAGE_LIST_PAGE = 1000
/**
 * Every open listing, read once per 30 s per server: listings are written by the ERP (not here), so a short
 * cache keeps new ones showing up quickly without reading every listing file on each request.
 */
const housingCache = new TtlCache<HousingListing[]>(30_000, 1)

async function loadOpenHousingListings(): Promise<HousingListing[]> {
  const bucket = await resolveBucket()
  // 1000개씩 끝까지 넘겨 읽는다 (예전엔 1000개 넘는 매물이 목록에서 빠졌다)
  const names: string[] = []
  for (let offset = 0; ; offset += STORAGE_LIST_PAGE) {
    const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: storageHeaders('application/json'),
      body: JSON.stringify({
        prefix: 'listings/',
        limit: STORAGE_LIST_PAGE,
        offset,
        sortBy: { column: 'updated_at', order: 'desc' },
      }),
    })
    // 실패는 캐시하지 않는다
    if (!res?.ok) throw new Error('Housing list failed')
    const items = ((await res.json().catch(() => null)) as Array<{ name?: string }> | null) || []
    names.push(...items.map((item) => String(item?.name || '').trim()).filter((name) => name.endsWith('.json')))
    if (items.length < STORAGE_LIST_PAGE) break
  }

  const listings = (
    await Promise.all(
      names.map((name) => fetchListingJson(bucket, name.startsWith('listings/') ? name : `listings/${name}`)),
    )
  ).filter((listing): listing is HousingListing => Boolean(listing))

  return listings.filter((listing) => listing.status === 'open').sort((a, b) => b.createdAt - a.createdAt)
}

export async function listStoredHousingListings(
  city?: CityId,
): Promise<HousingListing[]> {
  if (!isHousingStorageConfigured()) return []
  const listings = await housingCache.get('open', loadOpenHousingListings).catch(() => [] as HousingListing[])
  return listings.filter((listing) => (city ? housingListingMatchesCity(listing, city) : true))
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
