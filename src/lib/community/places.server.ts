import type { PlaceSearchResult } from '@/types/nyc'

const NYC_BIAS = {
  lat: 40.758,
  lng: -73.9855,
  radiusMeters: 35000,
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

/** 식당·주소 자동완성 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const key = getGoogleMapsApiKey()
  if (key) {
    return searchGooglePlaces(q, key)
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

async function searchGooglePlaces(
  query: string,
  key: string,
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
  return (data.predictions || []).slice(0, 6).map((item) => ({
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
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', `${query}, New York`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'us')
  url.searchParams.set('viewbox', '-74.3,40.9,-73.7,40.5')
  url.searchParams.set('bounded', '1')

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
