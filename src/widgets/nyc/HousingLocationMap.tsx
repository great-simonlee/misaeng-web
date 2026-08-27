'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { getLeafletTileConfig } from '@lib/community/leafletTiles'
import { cn } from '@lib'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'

type HousingMapPayload = {
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  mapsUrl: string
}

interface HousingLocationMapProps {
  listingId: string
  address: string
  neighborhood: string
  className?: string
}

/** 하우징 상세: Leaflet 핀 + 구글 맵스 길찾기 (맛집 상세와 동일 패턴) */
export function HousingLocationMap({
  listingId,
  address,
  neighborhood,
  className,
}: HousingLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [payload, setPayload] = useState<HousingMapPayload | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)

  const fallbackMapsUrl = `/api/housing/${encodeURIComponent(listingId)}/map?open=1`
  const mapsUrl = payload?.mapsUrl || fallbackMapsUrl
  const title = payload?.name || address
  const subtitle =
    payload?.address ||
    (neighborhood ? `${neighborhood}, New York` : 'New York')
  const latitude = payload?.latitude ?? null
  const longitude = payload?.longitude ?? null
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPayload(null)
    setReady(false)

    void (async () => {
      try {
        const res = await fetch(
          `/api/housing/${encodeURIComponent(listingId)}/map`,
          { cache: 'no-store' },
        )
        if (!res.ok) return
        const data = (await res.json()) as Partial<HousingMapPayload>
        if (cancelled) return
        setPayload({
          name: String(data.name || address),
          address: String(
            data.address ||
              (neighborhood ? `${neighborhood}, New York` : 'New York'),
          ),
          latitude:
            typeof data.latitude === 'number' ? data.latitude : null,
          longitude:
            typeof data.longitude === 'number' ? data.longitude : null,
          mapsUrl: String(data.mapsUrl || fallbackMapsUrl),
        })
      } catch {
        // 길찾기 링크로 폴백
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [listingId, address, neighborhood, fallbackMapsUrl])

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return

    let cancelled = false
    mapRef.current?.remove()
    mapRef.current = null
    markerRef.current = null
    setReady(false)

    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || latitude == null || longitude == null) {
        return
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([latitude, longitude], 15)

      const tiles = getLeafletTileConfig()
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        subdomains: tiles.subdomains,
        maxZoom: tiles.maxZoom,
      }).addTo(map)

      // 지도/핀 클릭 시 구글 맵스
      map.on('click', () => {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer')
      })

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
  }, [hasCoords, latitude, longitude, mapsUrl, listingId])

  useEffect(() => {
    if (!ready || !mapRef.current || !hasCoords || latitude == null || longitude == null) {
      return
    }
    let cancelled = false

    void (async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      markerRef.current?.remove()
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'housing-map-pin',
          html: placePinHtml(),
          iconSize: [24, 30],
          iconAnchor: [12, 28],
        }),
      })
      marker.on('click', () => {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer')
      })
      marker.addTo(map)
      markerRef.current = marker
      map.setView([latitude, longitude], 15, { animate: false })
      requestAnimationFrame(() => map.invalidateSize())
    })()

    return () => {
      cancelled = true
    }
  }, [ready, hasCoords, latitude, longitude, mapsUrl])

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

  return (
    <BoardSurface as='section' className={cn('overflow-hidden', className)}>
      <div className='flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5'>
        <div className='min-w-0'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]'>
            위치
          </p>
          <p className='mt-1 truncate text-[14px] font-semibold text-[var(--foreground)]'>
            {title}
          </p>
          <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
            {subtitle}
          </p>
        </div>
        <a
          href={mapsUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#e8eaee]'
        >
          길찾기
        </a>
      </div>

      <div className='relative mt-3 aspect-[16/10] overflow-hidden bg-[#e8eaee] sm:aspect-[16/9]'>
        {loading ? (
          <div className='absolute inset-0 animate-pulse bg-[#e8eaee]' />
        ) : hasCoords ? (
          <div
            ref={containerRef}
            className='absolute inset-0 z-0 h-full w-full cursor-pointer [&_.leaflet-control-attribution]:bg-white/80 [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-zoom]:cursor-default'
            role='link'
            tabIndex={0}
            aria-label={`${title} 구글 맵스에서 보기`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                window.open(mapsUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          />
        ) : (
          <a
            href={mapsUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center touch-manipulation'
          >
            <span className='text-[13px] font-semibold text-[var(--foreground)]'>
              구글 맵스에서 위치 보기
            </span>
            <span className='text-[12px] text-[var(--muted)]'>{subtitle}</span>
          </a>
        )}
      </div>
    </BoardSurface>
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
