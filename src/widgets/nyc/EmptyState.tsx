import Link from 'next/link'

import { cn } from '@lib'
import { byBrand } from '@lib/brand/design'

interface EmptyStateProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        byBrand(
          'rounded-[1.375rem] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-[var(--card-ring)] sm:px-8 sm:py-16',
          'rounded-[1.25rem] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.045)] ring-1 ring-black/[0.03] sm:px-8 sm:py-16',
        ),
        className,
      )}
    >
      <div
        className={byBrand(
          'relative mx-auto mb-5 flex size-16 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(150deg,#FFE3D3,#FFF6EE)] text-[var(--brand)]',
          'mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f4f5f7] text-[var(--muted)]',
        )}
      >
        <EmptyIcon className={byBrand('size-7', 'size-5')} />
      </div>
      <h3 className={byBrand('text-[1.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.2rem]', 'text-[1.05rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.125rem]')}>
        {title}
      </h3>
      <p className='mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={byBrand(
            'mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand)] px-6 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)]',
            'mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand)] px-6 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)]',
          )}
        >
          {actionLabel}
        </Link>
      ) : onAction && actionLabel ? (
        <button
          type='button'
          onClick={onAction}
          className='mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--foreground)] px-6 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9z'
      />
      <path strokeLinecap='round' d='M8 10h8M8 14h5' />
    </svg>
  )
}
