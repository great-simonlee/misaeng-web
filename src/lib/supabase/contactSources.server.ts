import {
  DEFAULT_CONTACT_SOURCES,
  normalizeContactSourceConfig,
  type ContactSourceConfigOption,
} from '@lib/community/contactSources'
import { TtlCache } from '@lib/supabase/listCache.server'

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
/** ellieo-erp(Contact Sources)가 쓰는 파일 */
const CONFIG_PATH = 'config/contact-sources.json'
const CONFIG_TTL_MS = 60_000

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
}

function storageHeaders() {
  const secretKey = getSupabaseSecretKey() || ''
  return { apikey: secretKey, Authorization: `Bearer ${secretKey}` }
}

async function storageFetch(path: string) {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return null
  try {
    return await fetch(`${url}${path}`, {
      method: 'GET',
      headers: storageHeaders(),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return null
  }
}

async function fetchConfig(): Promise<ContactSourceConfigOption[]> {
  if (!getSupabaseUrl() || !getSupabaseSecretKey()) return [...DEFAULT_CONTACT_SOURCES]
  const preferred = getPreferredBucket()
  const buckets = preferred === FALLBACK_BUCKET ? [preferred] : [preferred, FALLBACK_BUCKET]
  for (const bucket of buckets) {
    const res = await storageFetch(`/storage/v1/object/${bucket}/${CONFIG_PATH}`)
    if (!res?.ok) continue
    const options = normalizeContactSourceConfig(await res.json().catch(() => null))
    if (options) return options
  }
  return [...DEFAULT_CONTACT_SOURCES]
}

const cache = new TtlCache<ContactSourceConfigOption[]>(CONFIG_TTL_MS, 1)

/** ERP에서 바꾼 목록은 최대 1분 뒤 반영된다 */
export function getContactSourceConfig(): Promise<ContactSourceConfigOption[]> {
  return cache.get('config', fetchConfig)
}
