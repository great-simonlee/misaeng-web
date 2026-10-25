import type { MapViewKind } from './metrics'

/** 지도 하나가 화면에 만들어질 때 한 번 기록 (CARTO 타일 사용량 추정용). 실패해도 무시. */
export function trackMapView(kind: MapViewKind): void {
  try {
    const body = JSON.stringify({ kind })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/usage/map-view', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/usage/map-view', { method: 'POST', body, keepalive: true }).catch(() => {})
  } catch {
    // 집계 실패는 화면에 영향을 주지 않는다
  }
}
