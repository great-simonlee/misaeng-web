'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAnchoredPosition } from '@hooks/useAnchoredPosition'
import { cn } from '@lib'
import type { FoodVenueOption } from '@lib/community/venues'

type RestaurantNameFieldProps = {
  value: string
  onChange: (value: string) => void
  latitude: number | null
  longitude: number | null
  placeId?: string | null
  className?: string
  inputClassName?: string
  placeholder?: string
}

export function RestaurantNameField({
  value,
  onChange,
  latitude,
  longitude,
  placeId,
  className,
  inputClassName,
  placeholder = '음식점 이름',
}: RestaurantNameFieldProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [venues, setVenues] = useState<FoodVenueOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const filtered = value.trim()
    ? venues.filter((item) =>
        item.name.toLowerCase().includes(value.trim().toLowerCase()),
      )
    : venues
  const listOpen = open && filtered.length > 0
  const listPosition = useAnchoredPosition(inputRef, listOpen)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setVenues([])
      setOpen(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
    })
    if (placeId?.trim()) params.set('placeId', placeId.trim())

    void (async () => {
      try {
        const res = await fetch(`/api/community/venues?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = (await res.json().catch(() => null)) as {
          venues?: FoodVenueOption[]
        } | null
        if (!res.ok) {
          setVenues([])
          return
        }
        setVenues(Array.isArray(data?.venues) ? data.venues : [])
      } catch {
        if (controller.signal.aborted) return
        setVenues([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [latitude, longitude, placeId])

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [])

  const dropdown =
    mounted && listOpen && listPosition
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role='listbox'
            className='fixed z-[10050] overflow-auto rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.08]'
            style={{
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
              maxHeight: listPosition.maxHeight,
            }}
          >
            {filtered.map((item) => (
              <li key={item.name}>
                <button
                  type='button'
                  role='option'
                  aria-selected={item.name === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(item.name)
                    setOpen(false)
                  }}
                  className='flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left touch-manipulation transition hover:bg-[#f8f9fb]'
                >
                  <span className='truncate text-[14px] font-medium text-[var(--foreground)]'>
                    {item.name}
                  </span>
                  <span className='shrink-0 text-[11px] tabular-nums text-[var(--muted)]'>
                    후기 {item.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (venues.length > 0) setOpen(true)
        }}
        onFocus={() => {
          if (venues.length > 0) setOpen(true)
        }}
        className={inputClassName}
        placeholder={placeholder}
        maxLength={80}
        autoComplete='off'
        role='combobox'
        aria-expanded={listOpen}
        aria-controls={listId}
      />

      {loading ? (
        <p className='mt-1.5 text-[12px] text-[var(--muted)]'>
          이 위치의 기존 음식점을 확인하는 중…
        </p>
      ) : venues.length > 0 ? (
        <p className='mt-1.5 text-[12px] text-[var(--muted)]'>
          이 위치에서 등록된 음식점 {venues.length}곳 · 아래에서 고르거나 새로
          입력하세요
        </p>
      ) : latitude != null ? (
        <p className='mt-1.5 text-[12px] text-[var(--muted)]'>
          이 위치에 등록된 음식점이 없어요. 새 이름을 입력해 주세요
        </p>
      ) : (
        <p className='mt-1.5 text-[12px] text-[var(--muted)]'>
          목록·상세 페이지에 표시되는 이름이에요
        </p>
      )}

      {dropdown}
    </div>
  )
}
