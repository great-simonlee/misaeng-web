'use client'

/**
 * Bottom of an infinite-scroll list (usePagedList): the invisible sentinel that asks for the next page, a small
 * spinner while it loads, and a retry row when that page failed. Nothing at the end of the list.
 */
export function PagedListFooter({
  sentinelRef,
  hasMore,
  loadingMore,
  failed,
  onRetry,
  retryLabel,
  failedLabel,
}: {
  sentinelRef: (node: HTMLElement | null) => void
  hasMore: boolean
  loadingMore: boolean
  failed: boolean
  onRetry: () => void
  retryLabel: string
  failedLabel: string
}) {
  if (failed) {
    return (
      <div className='flex flex-col items-center gap-2 py-8 text-center'>
        <p className='text-[13px] text-[var(--muted)]'>{failedLabel}</p>
        <button type='button' onClick={onRetry} className='h-9 rounded-full bg-white px-4 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] hover:bg-[#fafbfc]'>
          {retryLabel}
        </button>
      </div>
    )
  }
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className='flex justify-center py-8' aria-busy={loadingMore}>
      {loadingMore ? <span className='size-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent' aria-hidden /> : null}
    </div>
  )
}
