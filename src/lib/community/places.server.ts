import type { PlaceSearchResult } from '@/types/nyc'

const NYC_BIAS = {
  lat: 40.758,
  lng: -73.9855,
  /** 브롱스·퀸즈·브루클린·스테이튼 아일랜드까지 커버 */
  radiusMeters: 45000,
}

function getGoogleMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  )
}

export function isGoogleMapsConfigured() {
  return Boolean(getGoogleMapsApiKey())
}

/** 식당·주소 자동완성 (Text Search + Autocomplete 병합) */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const key = getGoogleMapsApiKey()
  if (key) {
    return searchGooglePlaces(q, key)
  }
  return searchNominatim(q)
}

/** 주소만 검색 — 정확한 주소 + 위경도용 */
export async function searchAddresses(
  query: string,
): Promise<PlaceSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const key = getGoogleMapsApiKey()
  if (key) {
    return searchGoogleAddresses(q, key)
  }
  return searchNominatim(q)
}

export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceSearchResult | null> {
  const id = placeId.trim()
  if (!id) return null

  const key = getGoogleMapsApiKey()
  if (key && !id.startsWith('osm:')) {
    return detailsGooglePlace(id, key)
  }
  if (id.startsWith('osm:')) {
    return detailsNominatim(id.slice(4))
  }
  return null
}

/** NYC 맥락이 없으면 쿼리에 New York을 붙여 매칭률을 높임 */
function withNycContext(query: string) {
  const lower = query.toLowerCase()
  if (
    /\b(ny|nyc|new york|manhattan|brooklyn|queens|bronx|staten)\b/i.test(
      lower,
    )
  ) {
    return query
  }
  return `${query} New York`
}

async function searchGooglePlaces(
  query: string,
  key: string,
): Promise<PlaceSearchResult[]> {
  const contextualQuery = withNycContext(query)

  const [textResults, autocompleteResults] = await Promise.all([
    searchGoogleText(contextualQuery, key).catch(() => [] as PlaceSearchResult[]),
    searchGoogleAutocomplete(query, key, null).catch(
      () => [] as PlaceSearchResult[],
    ),
  ])

  // Text Search를 우선 (상호명 매칭이 더 강하고 좌표 포함)
  return mergePlaceResults(textResults, autocompleteResults).slice(0, 10)
}

/** 주소 전용: Autocomplete(address) + Geocoding으로 좌표까지 확보 */
async function searchGoogleAddresses(
  query: string,
  key: string,
): Promise<PlaceSearchResult[]> {
  const contextualQuery = withNycContext(query)

  const [autocompleteResults, geocodeResults] = await Promise.all([
    searchGoogleAutocomplete(query, key, 'address').catch(
      () => [] as PlaceSearchResult[],
    ),
    searchGoogleGeocode(contextualQuery, key).catch(
      () => [] as PlaceSearchResult[],
    ),
  ])

  // Geocode 결과를 우선 (주소 + 좌표가 바로 있음)
  return mergePlaceResults(geocodeResults, autocompleteResults).slice(0, 8)
}

async function searchGoogleGeocode(
  query: string,
  key: string,
): Promise<PlaceSearchResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  url.searchParams.set('key', key)
  url.searchParams.set('language', 'ko')
  url.searchParams.set('region', 'us')
  url.searchParams.set(
    'bounds',
    `${NYC_BIAS.lat - 0.35},${NYC_BIAS.lng - 0.45}|${NYC_BIAS.lat + 0.35},${NYC_BIAS.lng + 0.45}`,
  )

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('주소 검색에 실패했어요')
  const data = (await res.json()) as {
    status?: string
    error_message?: string
    results?: Array<{
      place_id?: string
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
      address_components?: Array<{
        long_name?: string
        short_name?: string
        types?: string[]
      }>
    }>
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Geocoding 오류: ${data.status}`)
  }

  return (data.results || [])
    .map((item) => {
      const placeId = String(item.place_id || '').trim()
      const address = String(item.formatted_address || '').trim()
      if (!placeId || !address) return null
      const lat = Number(item.geometry?.location?.lat)
      const lng = Number(item.geometry?.location?.lng)
      const street = item.address_components?.find((c) =>
        c.types?.includes('route'),
      )?.long_name
      const number = item.address_components?.find((c) =>
        c.types?.includes('street_number'),
      )?.long_name
      const name =
        [number, street].filter(Boolean).join(' ').trim() ||
        address.split(',')[0]?.trim() ||
        '주소'
      return {
        placeId,
        name,
        address,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
      } satisfies PlaceSearchResult
    })
    .filter((item): item is PlaceSearchResult => Boolean(item))
}

function mergePlaceResults(
  primary: PlaceSearchResult[],
  secondary: PlaceSearchResult[],
): PlaceSearchResult[] {
  const seen = new Set<string>()
  const merged: PlaceSearchResult[] = []
  for (const item of [...primary, ...secondary]) {
    const id = item.placeId.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(item)
  }
  return merged
}

/** 상호명·키워드 검색에 강한 Text Search */
async function searchGoogleText(
  query: string,
  key: string,
): Promise<PlaceSearchResult[]> {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/textsearch/json',
  )
  url.searchParams.set('query', query)
  url.searchParams.set('key', key)
  url.searchParams.set('language', 'ko')
  url.searchParams.set('region', 'us')
  url.searchParams.set('location', `${NYC_BIAS.lat},${NYC_BIAS.lng}`)
  url.searchParams.set('radius', String(NYC_BIAS.radiusMeters))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('장소 검색에 실패했어요')
  const data = (await res.json()) as {
    status?: string
    error_message?: string
    results?: Array<{
      place_id?: string
      name?: string
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
    }>
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places 오류: ${data.status}`)
  }

  return (data.results || [])
    .map((item) => {
      const placeId = String(item.place_id || '').trim()
      if (!placeId) return null
      const lat = Number(item.geometry?.location?.lat)
      const lng = Number(item.geometry?.location?.lng)
      return {
        placeId,
        name: String(item.name || '').trim() || '장소',
        address: String(item.formatted_address || '').trim(),
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
      } satisfies PlaceSearchResult
    })
    .filter((item): item is PlaceSearchResult => Boolean(item))
}

/** 타이핑 자동완성 */
async function searchGoogleAutocomplete(
  query: string,
  key: string,
  types: 'address' | null,
): Promise<PlaceSearchResult[]> {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  )
  url.searchParams.set('input', query)
  url.searchParams.set('key', key)
  url.searchParams.set('language', 'ko')
  url.searchParams.set('components', 'country:us')
  url.searchParams.set('location', `${NYC_BIAS.lat},${NYC_BIAS.lng}`)
  url.searchParams.set('radius', String(NYC_BIAS.radiusMeters))
  if (types) {
    url.searchParams.set('types', types)
  }

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('장소 검색에 실패했어요')
  const data = (await res.json()) as {
    status?: string
    error_message?: string
    predictions?: Array<{
      place_id: string
      description: string
      structured_formatting?: {
        main_text?: string
        secondary_text?: string
      }
    }>
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places 오류: ${data.status}`)
  }
  return (data.predictions || []).map((item) => ({
    placeId: item.place_id,
    name: item.structured_formatting?.main_text || item.description,
    address:
      item.structured_formatting?.secondary_text || item.description,
    latitude: null,
    longitude: null,
  }))
}

async function detailsGooglePlace(
  placeId: string,
  key: string,
): Promise<PlaceSearchResult | null> {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/details/json',
  )
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', key)
  url.searchParams.set('language', 'ko')
  url.searchParams.set('fields', 'place_id,name,formatted_address,geometry')

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('장소 정보를 불러오지 못했어요')
  const data = (await res.json()) as {
    status?: string
    error_message?: string
    result?: {
      place_id?: string
      name?: string
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
    }
  }
  if (data.status && data.status !== 'OK') {
    throw new Error(data.error_message || `Places 오류: ${data.status}`)
  }
  const result = data.result
  if (!result) return null
  const lat = Number(result.geometry?.location?.lat)
  const lng = Number(result.geometry?.location?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    placeId: result.place_id || placeId,
    name: result.name || '',
    address: result.formatted_address || '',
    latitude: lat,
    longitude: lng,
  }
}

async function searchNominatim(query: string): Promise<PlaceSearchResult[]> {
  const contextualQuery = withNycContext(query)

  // 1차: NYC viewbox 선호 (강제 제한 X)
  const preferred = await fetchNominatim(contextualQuery, {
    viewbox: true,
    bounded: false,
  })
  if (preferred.length > 0) return preferred

  // 2차: viewbox 없이 재시도
  return fetchNominatim(contextualQuery, { viewbox: false, bounded: false })
}

async function fetchNominatim(
  query: string,
  opts: { viewbox: boolean; bounded: boolean },
): Promise<PlaceSearchResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '10')
  url.searchParams.set('countrycodes', 'us')
  if (opts.viewbox) {
    url.searchParams.set('viewbox', '-74.35,40.95,-73.65,40.45')
  }
  if (opts.bounded) {
    url.searchParams.set('bounded', '1')
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'misaeng-nyc-community/1.0',
    },
  })
  if (!res.ok) throw new Error('장소 검색에 실패했어요')
  const data = (await res.json()) as Array<{
    place_id?: number | string
    display_name?: string
    name?: string
    lat?: string
    lon?: string
    type?: string
  }>
  return (data || []).map((item) => {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    const name =
      item.name?.trim() ||
      String(item.display_name || '')
        .split(',')[0]
        ?.trim() ||
      '장소'
    return {
      placeId: `osm:${item.place_id}`,
      name,
      address: String(item.display_name || ''),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
    }
  })
}

async function detailsNominatim(
  osmPlaceId: string,
): Promise<PlaceSearchResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/lookup')
  url.searchParams.set('osm_ids', `N${osmPlaceId},W${osmPlaceId},R${osmPlaceId}`)
  url.searchParams.set('format', 'jsonv2')
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'misaeng-nyc-community/1.0',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{
    place_id?: number | string
    display_name?: string
    name?: string
    lat?: string
    lon?: string
  }>
  const item = data?.[0]
  if (!item) return null
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    placeId: `osm:${item.place_id || osmPlaceId}`,
    name:
      item.name?.trim() ||
      String(item.display_name || '')
        .split(',')[0]
        ?.trim() ||
      '장소',
    address: String(item.display_name || ''),
    latitude: lat,
    longitude: lng,
  }
}

export function googleMapsEmbedSrc(lat: number, lng: number) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=16&hl=ko&output=embed&iwloc=near`
}

/** 상호작용 없는 정적 지도 이미지 URL (서버에서 키 포함 가능) */
export function buildStaticMapUrl(
  lat: number,
  lng: number,
  width = 640,
  height = 360,
) {
  const key = getGoogleMapsApiKey()
  if (key) {
    const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
    url.searchParams.set('center', `${lat},${lng}`)
    url.searchParams.set('zoom', '16')
    url.searchParams.set('size', `${width}x${height}`)
    url.searchParams.set('scale', '2')
    url.searchParams.set('maptype', 'roadmap')
    url.searchParams.set('markers', `color:0xF64310|${lat},${lng}`)
    url.searchParams.set('key', key)
    return { type: 'google' as const, url: url.toString() }
  }
  return {
    type: 'osm' as const,
    url: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=${width}x${height}&maptype=mapnik&markers=${lat},${lng},red-pushpin`,
  }
}
