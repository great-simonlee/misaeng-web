'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  buildFoodMapPins,
  NYC_MAP_CENTER,
  NYC_MAP_DEFAULT_ZOOM,
  type FoodMapPin,
} from '@lib/community/foodMap'
import { getLeafletTileConfig } from '@lib/community/leafletTiles'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'

type FoodPostsMapProps = {
  posts: CommunityPost[]
  boardId: NycCommunityBoardId
  className?: string
}

/** 맛집 후기 좌표를 Leaflet 핀으로 표시 */
export function FoodPostsMap({
  posts,
  boardId,
  className,
}: FoodPostsMapProps) {
  const pins = useMemo(() => buildFoodMapPins(posts), [posts])
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map())
  const selectedIdRef = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  selectedIdRef.current = selectedId

  const selected = useMemo(
    () => pins.find((pin) => pin.id === selectedId) ?? null,
    [pins, selectedId],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView(
        [NYC_MAP_CENTER.lat, NYC_MAP_CENTER.lng],
        NYC_MAP_DEFAULT_ZOOM,
      )

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      const tiles = getLeafletTileConfig()
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        subdomains: tiles.subdomains,
        maxZoom: tiles.maxZoom,
      }).addTo(map)

      mapRef.current = map
      setReady(true)
      requestAnimationFrame(() => map.invalidateSize())
    })()

    return () => {
      cancelled = true
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    let cancelled = false

    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelled) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()

      const bounds = L.latLngBounds([])

      for (const pin of pins) {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: makePinIcon(L, pin, pin.id === selectedIdRef.current),
          riseOnHover: true,
        })
        marker.on('click', () => {
          setSelectedId(pin.id)
          map.panTo([pin.latitude, pin.longitude], { animate: true })
        })
        marker.addTo(map)
        markersRef.current.set(pin.id, marker)
        bounds.extend([pin.latitude, pin.longitude])
      }

      if (pins.length === 1) {
        map.setView([pins[0].latitude, pins[0].longitude], 15)
      } else if (pins.length > 1 && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.18), { maxZoom: 15 })
      } else {
        map.setView(
          [NYC_MAP_CENTER.lat, NYC_MAP_CENTER.lng],
          NYC_MAP_DEFAULT_ZOOM,
        )
      }

      requestAnimationFrame(() => map.invalidateSize())
    })()

    return () => {
      cancelled = true
    }
  }, [pins, ready])

  useEffect(() => {
    if (!ready) return
    void (async () => {
      const L = (await import('leaflet')).default
      for (const pin of pins) {
        const marker = markersRef.current.get(pin.id)
        if (!marker) continue
        marker.setIcon(makePinIcon(L, pin, pin.id === selectedId))
      }
    })()
  }, [selectedId, pins, ready])

  useEffect(() => {
    if (!selectedId) return
    if (!pins.some((pin) => pin.id === selectedId)) {
      setSelectedId(null)
    }
  }, [pins, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    const t = window.setTimeout(onResize, 80)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
    }
  }, [ready])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={containerRef}
        className='absolute inset-0 z-0 bg-[#e8eaee] [&_.leaflet-bottom]:mb-2 [&_.leaflet-control-attribution]:bg-white/80 [&_.leaflet-control-attribution]:text-[9px]'
        role='application'
        aria-label='맛집 지도'
      />

      {pins.length === 0 ? (
        <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6'>
          <div className='rounded-2xl bg-white/95 px-5 py-4 text-center shadow-[0_8px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.06]'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>
              지도에 표시할 위치가 없어요
            </p>
            <p className='mt-1 text-[12px] text-[var(--muted)]'>
              주소·위치가 저장된 맛집 후기만 핀으로 보여 줍니다
            </p>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className='absolute inset-x-3 bottom-20 z-20 sm:inset-x-4 sm:bottom-[5.25rem]'>
          <div className='overflow-hidden rounded-2xl bg-white shadow-[0_10px_36px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.06]'>
            <div className='flex items-start justify-between gap-3 px-4 pt-3.5'>
              <div className='min-w-0'>
                <p className='truncate text-[15px] font-semibold text-[var(--foreground)]'>
                  {selected.name}
                </p>
                {selected.address ? (
                  <p className='mt-0.5 line-clamp-1 text-[12px] text-[var(--muted)]'>
                    {selected.address}
                  </p>
                ) : null}
                <p className='mt-1 text-[11px] font-medium tabular-nums text-[var(--brand)]'>
                  후기 {selected.posts.length}개
                </p>
              </div>
              <button
                type='button'
                onClick={() => setSelectedId(null)}
                className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[var(--muted)] touch-manipulation hover:bg-[#e8eaee]'
                aria-label='닫기'
              >
                ×
              </button>
            </div>
            <ul className='mt-2 max-h-40 divide-y divide-black/[0.05] overflow-y-auto border-t border-black/[0.05]'>
              {selected.posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/nyc/${boardId}/${post.id}`}
                    className='flex items-center gap-3 px-4 py-2.5 touch-manipulation transition hover:bg-[#fafbfc]'
                  >
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=''
                        className='size-10 shrink-0 rounded-lg object-cover bg-[#e8eaee]'
                      />
                    ) : (
                      <span className='size-10 shrink-0 rounded-lg bg-[#f3f4f6]' />
                    )}
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-[13px] font-semibold text-[var(--foreground)]'>
                        {post.title}
                      </span>
                      <span className='mt-0.5 block truncate text-[11px] text-[var(--muted)]'>
                        {post.description || '후기 보기'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function makePinIcon(
  L: typeof import('leaflet'),
  pin: FoodMapPin,
  active: boolean,
) {
  return L.divIcon({
    className: 'food-map-pin',
    html: pinMarkerHtml(pin, active),
    iconSize: [24, 30],
    iconAnchor: [12, 28],
  })
}

function pinMarkerHtml(pin: FoodMapPin, active: boolean) {
  const count = pin.posts.length
  const label = count > 1 ? String(count) : ''
  const bg = active ? '#c2410c' : '#F64310'
  const scale = active ? 'scale(1.1)' : 'scale(1)'
  return `
    <div style="transform:${scale};transform-origin:bottom center;transition:transform .15s ease">
      <div style="
        position:relative;
        width:24px;height:30px;
        display:flex;align-items:flex-start;justify-content:center;
        filter:drop-shadow(0 1px 2px rgba(15,23,42,0.28));
      ">
        <svg width="24" height="30" viewBox="0 0 36 44" aria-hidden="true">
          <path d="M18 0C8.6 0 1 7.6 1 17c0 11.4 14.2 25.2 15.5 26.4a2 2 0 0 0 2.9 0C20.8 42.2 35 28.4 35 17 35 7.6 27.4 0 18 0z" fill="${bg}"/>
          <circle cx="18" cy="16" r="7.5" fill="#fff"/>
        </svg>
        ${
          label
            ? `<span style="
                position:absolute;top:5px;left:0;right:0;
                text-align:center;font:700 9px/12px system-ui,sans-serif;
                color:${bg};
              ">${label}</span>`
            : ''
        }
      </div>
    </div>
  `
}
