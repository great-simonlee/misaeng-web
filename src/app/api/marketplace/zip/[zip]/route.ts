import { NextResponse } from 'next/server'

import { normalizeMarketZip } from '@lib/community/marketplace'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 중고거래 거래 지역 지도 (app, 로그인 필요): ZIP 코드 → 그 지역 중심 좌표. 주소가 아니라 ZIP 코드만 쓴다.
 *   GET /api/marketplace/zip/10025 → { zip, latitude, longitude } (못 찾으면 404, 앱은 기기 지오코더로 대신한다)
 * OpenStreetMap Nominatim 의 우편번호 검색. 이용 정책(초당 1건, 식별 가능한 User-Agent, 결과 캐시)을 지키려고
 * 서버 전체에서 한 줄로 1초에 한 번만 보내고, 찾은 ZIP 은 오래, 못 찾은 ZIP 도 잠시 메모리에 둔다.
 */
type Point = { latitude: number; longitude: number }

const USER_AGENT = 'Misaeng/1.0 (+https://misaeng.com)'
const NOMINATIM_INTERVAL_MS = 1100
const CACHE_MAX = 5000
/** 못 찾은 ZIP (미국 밖·없는 번호)은 하루, Nominatim 오류는 5분 동안 다시 묻지 않는다 */
const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000
const ERROR_TTL_MS = 5 * 60 * 1000

const found = new Map<string, Point>()
const missing = new Map<string, number>()
const inflight = new Map<string, Promise<Point | null>>()

/** Process-wide queue: outbound Nominatim calls start at least NOMINATIM_INTERVAL_MS apart. */
let queue: Promise<void> = Promise.resolve()
let lastCallAt = 0
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + NOMINATIM_INTERVAL_MS - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastCallAt = Date.now()
  })
  queue = run.catch(() => undefined)
  return run.then(task)
}

function remember<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= CACHE_MAX) map.clear()
  map.set(key, value)
}

async function fetchZip(zip: string): Promise<{ point: Point | null; transient: boolean }> {
  const url =
    `https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=us` +
    '&format=json&addressdetails=1&limit=1'
  const response = await throttled(() =>
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8000),
    }),
  )
  if (!response.ok) return { point: null, transient: true }
  const [hit] = (await response.json()) as { lat?: string; lon?: string; address?: { country_code?: string } }[]
  const latitude = Number(hit?.lat)
  const longitude = Number(hit?.lon)
  // 미국 ZIP 만 (다른 나라의 같은 번호 우편번호는 쓰지 않는다)
  const inUs = !hit?.address?.country_code || hit.address.country_code.toLowerCase() === 'us'
  const point = hit && inUs && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
  return { point, transient: false }
}

async function lookup(zip: string): Promise<Point | null> {
  const hit = found.get(zip)
  if (hit) return hit
  const missUntil = missing.get(zip)
  if (missUntil && missUntil > Date.now()) return null
  const pending = inflight.get(zip)
  if (pending) return pending

  const request = fetchZip(zip)
    .catch(() => ({ point: null, transient: true }))
    .then(({ point, transient }) => {
      if (point) {
        remember(found, zip, point)
        missing.delete(zip)
      } else {
        remember(missing, zip, Date.now() + (transient ? ERROR_TTL_MS : NOT_FOUND_TTL_MS))
      }
      return point
    })
    .finally(() => inflight.delete(zip))
  inflight.set(zip, request)
  return request
}

export async function GET(_request: Request, { params }: { params: Promise<{ zip: string }> }) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const zip = normalizeMarketZip((await params).zip)
  if (!zip) return NextResponse.json({ error: 'Invalid ZIP code.' }, { status: 400 })
  const point = await lookup(zip)
  if (!point) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // 로그인한 사람에게만 주므로 CDN 이 아니라 기기에만 오래 둔다
  return NextResponse.json({ zip, ...point }, { headers: { 'Cache-Control': 'private, max-age=86400' } })
}
