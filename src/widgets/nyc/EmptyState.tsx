import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className='rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center sm:px-6 sm:py-12'>
      <h3 className='text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
        {title}
      </h3>
      <p className='mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:text-sm'>
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className='mt-6 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-full bg-[#F64310] px-5 text-sm font-semibold text-white touch-manipulation transition hover:bg-[#d93a0e] sm:w-auto'
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
