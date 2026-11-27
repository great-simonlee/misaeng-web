import { USAGE_METRICS } from '@lib/usage/metrics'
import { recordUsage } from '@lib/usage/server'

import listingOptions from './listingOptions.json'
import mtaStations from './mtaSubwayStations.json'

/**
 * Agent listings' location (owner 2026-11-27): the ZIP table (area + neighborhoods, shared with the iOS composer via
 * scripts/agent-listing-options.mjs) and "가까운 지하철" from the building's street address, in the same
 * "🚇 N min walk to Station (lines)" lines staff (ERP) listings carry (ellieo-erp src/app/api/maps/nearby-subway).
 *
 * Geocoding: Google Geocoding with GOOGLE_MAPS_API_KEY (the key the web already uses for community places), else the
 * free NYC Planning Labs GeoSearch (NYC addresses only, no key). Stations: the MTA station list (same file the ERP
 * uses to name lines) within 1 km; walking minutes from Google Distance Matrix when the key allows it, else the
 * straight-line distance with a street-grid detour. The street address and coordinates stay on the row (never in the
 * public listing: toPublicHousingListing drops them).
 */

export type ZipInfo = { area: string; neighborhoods: string[] }

const ZIPS = listingOptions.zips as Record<string, ZipInfo>

export function zipInfo(zip: string | null | undefined): ZipInfo | null {
  return (zip && ZIPS[zip]) || null
}

export const LISTING_VOCAB = {
  amenities: new Set(listingOptions.amenities),
  utilities: new Set(listingOptions.utilities),
  appliances: new Set(listingOptions.appliances),
  partWalls: new Set(listingOptions.partWalls),
  roomTypes: new Set(listingOptions.roomTypes),
}

const RADIUS_METERS = 1000
const MAX_STATIONS = 8
/** A walk along streets is longer than the straight line (used only without Distance Matrix). */
const DETOUR = 1.3
const WALK_METERS_PER_MIN = 80

type Station = { name: string; lat: number; lng: number; routes: string }

function googleKey() {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ''
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** "45-15 Vernon Blvd" → lat/lng, or null when nothing reliable is found. */
export async function geocodeListingAddress(street: string, zip: string, area: string) {
  const state = area === 'New Jersey' ? 'NJ' : 'NY'
  const query = `${street}, ${area === 'New Jersey' ? '' : `${area}, `}${state} ${zip}`.replace(/\s+,/g, ',')
  const key = googleKey()
  if (key) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('address', query)
      url.searchParams.set('components', `country:US|postal_code:${zip}`)
      url.searchParams.set('key', key)
      recordUsage(USAGE_METRICS.geocode)
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      const data = (await res.json()) as { status?: string; results?: { geometry?: { location?: { lat: number; lng: number } } }[] }
      const loc = data.status === 'OK' ? data.results?.[0]?.geometry?.location : null
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) return { lat: loc.lat, lng: loc.lng }
    } catch (error) {
      console.error('Agent listing geocode (Google) error:', error)
    }
  }
  if (state !== 'NY') return null
  try {
    const url = new URL('https://geosearch.planninglabs.nyc/v2/search')
    url.searchParams.set('text', `${street}, ${zip}`)
    url.searchParams.set('size', '1')
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
    const data = (await res.json()) as {
      features?: { geometry?: { coordinates?: [number, number] }; properties?: { postalcode?: string } }[]
    }
    const feature = data.features?.[0]
    const [lng, lat] = feature?.geometry?.coordinates ?? []
    // A hit in another ZIP means the street wasn't found where the agent said it is.
    if (feature?.properties?.postalcode && feature.properties.postalcode !== zip) return null
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat as number, lng: lng as number }
  } catch (error) {
    console.error('Agent listing geocode (GeoSearch) error:', error)
  }
  return null
}

function sortRoutes(tokens: Iterable<string>) {
  const all = [...new Set([...tokens].map((t) => t.trim().toUpperCase()).filter(Boolean))]
  const nums = all.filter((t) => /^\d+$/.test(t)).sort((a, b) => Number(a) - Number(b))
  const letters = all.filter((t) => !/^\d+$/.test(t)).sort()
  return [...nums, ...letters].join(', ')
}

/** Stations within 1 km; entries of one complex (same name, a few hundred metres apart) merged into one. */
function nearbyStations(lat: number, lng: number) {
  const near = (mtaStations as Station[])
    .map((station) => ({ ...station, meters: haversineMeters(lat, lng, station.lat, station.lng) }))
    .filter((station) => station.meters <= RADIUS_METERS)
    .sort((a, b) => a.meters - b.meters)
  const merged: (Station & { meters: number; tokens: Set<string> })[] = []
  for (const station of near) {
    const same = merged.find(
      (m) => m.name === station.name && haversineMeters(m.lat, m.lng, station.lat, station.lng) <= 350,
    )
    const tokens = station.routes.split(/[\s,]+/).filter(Boolean)
    if (same) tokens.forEach((t) => same.tokens.add(t))
    else merged.push({ ...station, tokens: new Set(tokens) })
  }
  return merged.slice(0, MAX_STATIONS).map((m) => ({ name: m.name, lat: m.lat, lng: m.lng, meters: m.meters, routes: sortRoutes(m.tokens) }))
}

async function walkingMinutes(lat: number, lng: number, stations: { lat: number; lng: number; meters: number }[]) {
  const estimate = stations.map((s) => Math.max(1, Math.round((s.meters * DETOUR) / WALK_METERS_PER_MIN)))
  const key = googleKey()
  if (!key || stations.length === 0) return estimate
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', `${lat},${lng}`)
    url.searchParams.set('destinations', stations.map((s) => `${s.lat},${s.lng}`).join('|'))
    url.searchParams.set('mode', 'walking')
    url.searchParams.set('key', key)
    recordUsage(USAGE_METRICS.distanceMatrix, stations.length)
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
    const data = (await res.json()) as {
      status?: string
      rows?: { elements?: { status?: string; duration?: { value?: number } }[] }[]
    }
    if (data.status !== 'OK') return estimate
    const elements = data.rows?.[0]?.elements ?? []
    return stations.map((_, i) => {
      const seconds = elements[i]?.status === 'OK' ? elements[i]?.duration?.value : undefined
      return seconds != null ? Math.max(1, Math.round(seconds / 60)) : estimate[i]
    })
  } catch {
    return estimate
  }
}

/**
 * The building's coordinates and its "가까운 지하철" lines (closest walk first). Never throws: an address that
 * can't be found gives { latitude: null, …, subway: [] } and the listing posts without the subway card.
 */
export async function locateListing(street: string, zip: string, area: string) {
  const point = await geocodeListingAddress(street, zip, area).catch(() => null)
  if (!point) return { latitude: null, longitude: null, subway: [] as string[] }
  const stations = nearbyStations(point.lat, point.lng)
  const minutes = await walkingMinutes(point.lat, point.lng, stations)
  const subway = stations
    .map((station, i) => ({ station, minutes: minutes[i] }))
    .sort((a, b) => a.minutes - b.minutes)
    .map(({ station, minutes: m }) => `🚇 ${m} min walk to ${station.name}${station.routes ? ` (${station.routes})` : ''}`)
  return { latitude: point.lat, longitude: point.lng, subway }
}
