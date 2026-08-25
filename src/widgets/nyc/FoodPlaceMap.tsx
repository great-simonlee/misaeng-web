'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { FoodPlacePoint } from '@lib/community/foodMap'
import { cn } from '@lib'

type FoodPlaceMapProps = {
  place: FoodPlacePoint
  className?: string
  heightClassName?: string
}

/** 맛집 상세: 단일 식당 위치를 Leaflet 핀으로 표시 */
export function FoodPlaceMap({
  place,
  className,
  heightClassName = 'h-48 sm:h-56',
}: FoodPlaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([place.latitude, place.longitude], 15)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(map)

      mapRef.current = map
      setReady(true)
      requestAnimationFrame(() => map.invalidateSize())
    })()

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    let cancelled = false

    void (async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      markerRef.current?.remove()
      const marker = L.marker([place.latitude, place.longitude], {
        icon: L.divIcon({
          className: 'food-map-pin',
          html: placePinHtml(),
          iconSize: [24, 30],
          iconAnchor: [12, 28],
        }),
      })
      marker.addTo(map)
      markerRef.current = marker
      map.setView([place.latitude, place.longitude], 15, { animate: false })
      requestAnimationFrame(() => map.invalidateSize())
    })()

    return () => {
      cancelled = true
    }
  }, [ready, place.latitude, place.longitude])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    const t = window.setTimeout(onResize, 120)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
    }
  }, [ready])

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.latitude},${place.longitude}`,
  )}`

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]',
        className,
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative z-0 w-full bg-[#e8eaee] [&_.leaflet-control-attribution]:bg-white/80 [&_.leaflet-control-attribution]:text-[9px]',
          heightClassName,
        )}
        role='application'
        aria-label={`${place.name} 위치 지도`}
      />
      <div className='flex items-center justify-between gap-3 border-t border-black/[0.05] px-3.5 py-2.5'>
        <div className='min-w-0'>
          <p className='truncate text-[13px] font-semibold text-[var(--foreground)]'>
            {place.name}
          </p>
          {place.address ? (
            <p className='mt-0.5 truncate text-[11px] text-[var(--muted)]'>
              {place.address}
            </p>
          ) : null}
        </div>
        <a
          href={mapsHref}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#e8eaee]'
        >
          길찾기
        </a>
      </div>
    </div>
  )
}

function placePinHtml() {
  return `
    <div style="
      position:relative;
      width:24px;height:30px;
      filter:drop-shadow(0 1px 2px rgba(15,23,42,0.28));
    ">
      <svg width="24" height="30" viewBox="0 0 36 44" aria-hidden="true">
        <path d="M18 0C8.6 0 1 7.6 1 17c0 11.4 14.2 25.2 15.5 26.4a2 2 0 0 0 2.9 0C20.8 42.2 35 28.4 35 17 35 7.6 27.4 0 18 0z" fill="#F64310"/>
        <circle cx="18" cy="16" r="7.5" fill="#fff"/>
      </svg>
    </div>
  `
}
