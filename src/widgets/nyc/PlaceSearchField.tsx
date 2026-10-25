'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAnchoredPosition } from '@hooks/useAnchoredPosition'
import { cn } from '@lib'
import { useLocale, useT } from '@lib/i18n/client'
import type { PlaceSearchResult } from '@/types/nyc'

type PlaceSearchFieldProps = {
  value: PlaceSearchResult | null
  onChange: (place: PlaceSearchResult | null) => void
  className?: string
  /** address: 주소·좌표만 / place: 상호·장소 통합 검색 */
  mode?: 'address' | 'place'
}

export function PlaceSearchField({
  value,
  onChange,
  className,
  mode = 'place',
}: PlaceSearchFieldProps) {
  const t = useT('food')
  const locale = useLocale()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputWrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  // Google 자동완성 세션 — 입력부터 장소 선택(상세 조회)까지를 한 번으로 과금받는다
  const sessionRef = useRef<string | null>(null)
  const sessionToken = () => {
    sessionRef.current ??=
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    return sessionRef.current
  }

  const listOpen = open && results.length > 0 && !value
  const listPosition = useAnchoredPosition(inputWrapRef, listOpen)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (settleRef.current) clearTimeout(settleRef.current)

    const q = query.trim()
    if (q.length < 2) {
      abortRef.current?.abort()
      abortRef.current = null
      requestIdRef.current += 1
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    /**
     * 두 단계로 검색한다 (비용 절감, 결과 품질은 그대로):
     * 1) 타이핑 중 (250ms 멈춤) — 자동완성만 (세션 과금, 저렴)
     * 2) 입력을 멈춤 (900ms) — 상호명 검색(Text Search)까지 합친 전체 결과로 바꾼다 (검색어별 캐시)
     */
    const run = (settled: boolean) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const requestId = ++requestIdRef.current

      void (async () => {
        try {
          const params = new URLSearchParams({
            q,
            mode,
            session: sessionToken(),
            settled: settled ? '1' : '0',
          })
          const res = await fetch(`/api/places/search?${params}`, {
            cache: 'no-store',
            signal: controller.signal,
          })
          if (requestId !== requestIdRef.current) return

          const data = (await res.json().catch(() => null)) as {
            results?: PlaceSearchResult[]
            error?: string
          } | null
          if (requestId !== requestIdRef.current) return

          if (!res.ok) {
            throw new Error(data?.error || t('placeSearch.errors.searchFailed'))
          }

          const next = data?.results || []
          // 빠른 자동완성 결과가 없더라도 전체 검색 결과를 기다리는 동안 목록을 닫지 않는다
          if (!settled && next.length === 0) return
          setResults(next)
          setOpen(next.length > 0)
          setError(null)
        } catch (err) {
          if (controller.signal.aborted) return
          if (requestId !== requestIdRef.current) return
          setResults([])
          setOpen(false)
          setError(
            err instanceof Error ? err.message : t('placeSearch.errors.searchFailed'),
          )
        } finally {
          if (requestId === requestIdRef.current && settled) {
            setLoading(false)
          }
        }
      })()
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => run(false), 250)
    settleRef.current = setTimeout(() => run(true), 900)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (settleRef.current) clearTimeout(settleRef.current)
    }
  }, [query, mode, t])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function selectResult(item: PlaceSearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    abortRef.current?.abort()
    requestIdRef.current += 1
    setLoading(false)
    // 선택으로 자동완성 세션이 끝난다. 다음 검색은 새 세션
    const session = sessionRef.current
    sessionRef.current = null

    if (item.latitude != null && item.longitude != null) {
      onChange(item)
      setError(null)
      return
    }

    setResolving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(item.placeId)}${
          session ? `&session=${encodeURIComponent(session)}` : ''
        }`,
        { cache: 'no-store' },
      )
      const data = (await res.json().catch(() => null)) as {
        place?: PlaceSearchResult
        error?: string
      } | null
      if (!res.ok || !data?.place) {
        throw new Error(data?.error || t('placeSearch.errors.detailsFailed'))
      }
      if (data.place.latitude == null || data.place.longitude == null) {
        throw new Error(t('placeSearch.errors.noCoordinates'))
      }
      onChange(data.place)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('placeSearch.errors.detailsFailed'),
      )
    } finally {
      setResolving(false)
    }
  }

  const mapSrc =
    value?.latitude != null && value?.longitude != null
      ? `https://maps.google.com/maps?q=${encodeURIComponent(
          `${value.latitude},${value.longitude}`,
        )}&z=16&hl=${locale}&output=embed&iwloc=near`
      : null

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
            {results.map((item) => (
              <li key={item.placeId}>
                <button
                  type='button'
                  role='option'
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void selectResult(item)}
                  className='flex w-full flex-col px-3.5 py-2.5 text-left touch-manipulation transition hover:bg-[#f8f9fb] active:bg-[#f3f4f6]'
                >
                  <span className='truncate text-[14px] font-medium text-[var(--foreground)]'>
                    {mode === 'address'
                      ? item.address || item.name
                      : item.name}
                  </span>
                  <span className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                    {mode === 'address'
                      ? item.name !== item.address
                        ? item.name
                        : t('placeSearch.pickExactAddress')
                      : item.address}
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
      {value ? (
        <div className='overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
          {mapSrc ? (
            <div className='relative aspect-[2/1] overflow-hidden bg-[#eceef1]'>
              <iframe
                title={t('placeSearch.mapTitle', { name: value.name })}
                src={mapSrc}
                className='pointer-events-none absolute left-0 top-[-48px] h-[calc(100%+88px)] w-full border-0'
                loading='lazy'
                referrerPolicy='no-referrer-when-downgrade'
                tabIndex={-1}
              />
              <div className='absolute inset-0 z-10' aria-hidden />
            </div>
          ) : null}
          <div className='flex items-center gap-3 px-4 py-3.5'>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
                {mode === 'address'
                  ? value.address || value.name
                  : value.name}
              </p>
              {mode === 'address' ? (
                value.name && value.name !== value.address ? (
                  <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                    {value.name}
                  </p>
                ) : null
              ) : (
                <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                  {value.address}
                </p>
              )}
            </div>
            <button
              type='button'
              onClick={() => {
                onChange(null)
                setQuery('')
                setResults([])
                setOpen(false)
                setError(null)
              }}
              className='shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:bg-[#f8f9fb] hover:text-[var(--foreground)]'
            >
              {t('placeSearch.change')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={inputWrapRef} className='relative'>
            <SearchIcon className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]' />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setOpen(true)
              }}
              placeholder={
                mode === 'address'
                  ? t('placeSearch.addressPlaceholder')
                  : t('placeSearch.placePlaceholder')
              }
              className='h-11 w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'
              autoComplete='off'
              autoCorrect='off'
              spellCheck={false}
              role='combobox'
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-autocomplete='list'
            />
            {(loading || resolving) && (
              <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]'>
                {resolving ? t('placeSearch.resolving') : t('placeSearch.searching')}
              </span>
            )}
          </div>
          {dropdown}
          {!loading &&
          !resolving &&
          query.trim().length >= 2 &&
          results.length === 0 &&
          !error ? (
            <p className='mt-2 text-[12px] text-[var(--muted)]'>
              {t('placeSearch.noResults')}
            </p>
          ) : null}
          <p className='mt-2 text-[12px] text-[var(--muted)]'>
            {mode === 'address'
              ? t('placeSearch.addressHint')
              : t('placeSearch.placeHint')}
          </p>
        </>
      )}
      {error ? (
        <p className='mt-2 text-[12px] font-medium text-red-600'>{error}</p>
      ) : null}
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={className}
      aria-hidden
    >
      <circle cx='11' cy='11' r='7' />
      <path strokeLinecap='round' d='m20 20-3.5-3.5' />
    </svg>
  )
}
