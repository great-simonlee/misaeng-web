'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Infinite scroll over a cursor-paged API (owner 11-23: lists no longer fetch everything at once).
 * - `key` changes (board, city, filters) → start again from page 1; responses for an old key are ignored.
 * - `sentinelRef` goes on an element under the list; when it comes within ~600px of the viewport the next page loads.
 * - `reload()` refetches page 1 (pull to refresh); `retry()` repeats the page that failed.
 */
/** `meta`: anything else the first page carries (e.g. chip counts), kept from page 1 */
export type Page<T> = { items: T[]; nextCursor: string | null; total: number; meta?: unknown }

export function usePagedList<T extends { id: string }>(
  key: string,
  fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<Page<T>>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [meta, setMeta] = useState<unknown>(undefined)
  const [cursor, setCursor] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const generation = useRef(0)
  const busy = useRef(false)
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string | null, gen: number, first: boolean) => {
    if (busy.current && !first) return
    busy.current = true
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    if (first) setLoading(true)
    else setLoadingMore(true)
    try {
      const page = await fetchRef.current(from, abort.signal)
      if (gen !== generation.current) return
      setItems((prev) => {
        if (first) return page.items
        const seen = new Set(prev.map((item) => item.id))
        return [...prev, ...page.items.filter((item) => !seen.has(item.id))]
      })
      setTotal(page.total)
      if (first) setMeta(page.meta)
      setCursor(page.nextCursor)
      setDone(!page.nextCursor)
      setError(null)
    } catch (err) {
      if (gen !== generation.current || abort.signal.aborted) return
      setError(err)
    } finally {
      if (gen === generation.current) {
        busy.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  // New key → page 1 (deferred so the effect itself doesn't set state synchronously)
  useEffect(() => {
    if (!enabled) return
    const gen = ++generation.current
    busy.current = false
    const timer = window.setTimeout(() => {
      setDone(false)
      setCursor(null)
      void load(null, gen, true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [key, enabled, load])

  const loadMore = useCallback(() => {
    if (done || busy.current || loading || error) return
    void load(cursor, generation.current, false)
  }, [cursor, done, loading, error, load])

  const reload = useCallback(async () => {
    const gen = ++generation.current
    busy.current = false
    await load(null, gen, true)
  }, [load])

  const retry = useCallback(() => {
    setError(null)
    void load(cursor, generation.current, items.length === 0)
  }, [cursor, items.length, load])

  // Sentinel observer
  const observer = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  const visible = useRef(false)
  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    visible.current = false
    if (!node) return
    observer.current = new IntersectionObserver(
      (entries) => {
        visible.current = entries.some((entry) => entry.isIntersecting)
        if (visible.current) loadMoreRef.current()
      },
      { rootMargin: '600px 0px' },
    )
    observer.current.observe(node)
  }, [])
  // A short page can leave the sentinel on screen: the observer won't fire again, so keep going from here
  useEffect(() => {
    if (!visible.current || loading || loadingMore) return
    const timer = window.setTimeout(() => loadMoreRef.current(), 0)
    return () => window.clearTimeout(timer)
  }, [items.length, loading, loadingMore])

  return { items, total, meta, loading, loadingMore, error, hasMore: !done, loadMore, reload, retry, sentinelRef, setItems }
}

/** Debounced copy of a value (search boxes) */
export function useDebounced<T>(value: T, ms = 300): T {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setOut(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return out
}

/**
 * Infinite scroll over a list that is already loaded (its filter counts need the whole set): shows `step` items,
 * then `step` more each time the sentinel comes near. Back to the first `step` when `resetKey` changes.
 */
export function useWindowedList(total: number, step: number, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, count: step })
  const count = state.key === resetKey ? state.count : step
  if (state.key !== resetKey) setState({ key: resetKey, count: step })
  const totalRef = useRef(total)
  useEffect(() => {
    totalRef.current = total
  }, [total])
  const observer = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!node) return
      observer.current = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          setState((prev) => (prev.count < totalRef.current ? { ...prev, count: prev.count + step } : prev))
        },
        { rootMargin: '600px 0px' },
      )
      observer.current.observe(node)
    },
    [step],
  )
  return { count, hasMore: count < total, sentinelRef }
}
