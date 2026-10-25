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

/**
 * CARTO 키가 있으면 light_all(밝은 지도), 없으면 OSM 표준 타일.
 * CARTO 무료 키는 월 타일 요청 수로 한도가 있다 (2026-12부터 월 100만) — 지도는 화면에 보일 때만
 * 만들도록(useInView) 하고, 타일 1장 = 요청 1건이다. 사용량: carto.com/basemaps/apikey
 */
export function getLeafletTileConfig(): LeafletTileConfig {
  const key = getCartoApiKey()
  if (key) {
    return {
      url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      attribution: CARTO_ATTRIBUTION,
      // URL에 {s}가 없어 쓰이지 않지만, 지도 컴포넌트가 이 값을 그대로 넘기므로 비워 두면 Leaflet이 멈춘다
      subdomains: 'a',
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
