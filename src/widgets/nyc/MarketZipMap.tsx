'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { cn } from '@lib'
import { normalizeMarketZip } from '@lib/community/marketplace'
import { getLeafletTileConfig } from '@lib/community/leafletTiles'

/**
 * 중고거래 거래 지역: a small, simple map of the ZIP's area (owner 11-23). Only an approximate circle — never a pin,
 * since the listing has no address. Coordinates from GET /api/marketplace/zip/{zip} (Nominatim, cached server side).
 */
export function MarketZipMap({ zip, className }: { zip: string; className?: string }) {
  const valid = normalizeMarketZip(zip)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const [point, setPoint] = useState<{ zip: string; latitude: number; longitude: number } | null>(null)
  const [missing, setMissing] = useState<string | null>(null)

  // Look the ZIP up (debounced while typing)
  useEffect(() => {
    if (!valid) return
    let alive = true
    const timer = window.setTimeout(() => {
      void fetch(`/api/marketplace/zip/${valid}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { latitude?: number; longitude?: number } | null) => {
          if (!alive) return
          if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
            setPoint({ zip: valid, latitude: data.latitude, longitude: data.longitude })
          } else setMissing(valid)
        })
        .catch(() => alive && setMissing(valid))
    }, 350)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [valid])

  const shown = point && point.zip === valid ? point : null

  useEffect(() => {
    if (!shown || !containerRef.current) return
    let cancelled = false
    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return
      mapRef.current?.remove()
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView([shown.latitude, shown.longitude], 13)
      const tiles = getLeafletTileConfig()
      L.tileLayer(tiles.url, { attribution: tiles.attribution, subdomains: tiles.subdomains, maxZoom: tiles.maxZoom }).addTo(map)
      L.circle([shown.latitude, shown.longitude], {
        radius: 900,
        color: '#F64310',
        weight: 2,
        fillColor: '#F64310',
        fillOpacity: 0.14,
      }).addTo(map)
      mapRef.current = map
      requestAnimationFrame(() => map.invalidateSize())
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [shown])

  if (!valid || missing === valid) return null
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-[#eef0f3] ring-1 ring-black/[0.06]', className)}>
      <div ref={containerRef} className='h-36 w-full' aria-hidden />
      <span className='pointer-events-none absolute left-2.5 top-2.5 z-[500] rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-[var(--foreground)] shadow-sm'>
        {valid}
      </span>
      {!shown ? <div className='absolute inset-0 animate-pulse bg-[#eef0f3]' /> : null}
    </div>
  )
}
