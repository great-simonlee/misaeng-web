/**
 * Leaflet 타일 레이어 설정.
 * Leaflet 자체는 API 키가 없고, CARTO basemap 타일만 키가 필요합니다.
 * @see https://carto.com/basemaps/apikey/
 */

export type LeafletTileConfig = {
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'

function getCartoApiKey(): string {
  return process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() || ''
}

/** CARTO 키가 있으면 light_all, 없으면 OSM 표준 타일 */
export function getLeafletTileConfig(): LeafletTileConfig {
  const key = getCartoApiKey()
  if (key) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      attribution: CARTO_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    subdomains: 'abc',
    maxZoom: 19,
  }
}
