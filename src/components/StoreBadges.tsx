import { cn } from '@lib'

const badgeClass =
  'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-white/20 bg-black px-2.5 py-1.5 text-white shadow-sm transition hover:border-white/35 hover:bg-zinc-900 active:scale-[0.98]'

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-6 w-6 shrink-0', className)} viewBox='0 0 24 24' fill='currentColor' aria-hidden>
      <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
    </svg>
  )
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-6 w-6 shrink-0', className)} viewBox='0 0 24 24' aria-hidden>
      <path
        fill='#4285F4'
        d='M3.609 1.814L13.792 12 3.61 22.186a1.006 1.006 0 0 1-.602-.918V2.732a1.006 1.006 0 0 1 .601-.918'
      />
      <path
        fill='#34A853'
        d='M16.85 15.096l-3.058-3.058 3.058-3.058 4.304 2.516c.612.357.612 1.237 0 1.594l-4.304 2.516z'
      />
      <path
        fill='#FBBC04'
        d='M16.85 8.98l-3.057 3.058L3.609 1.814c.198-.116.436-.116.634 0L16.85 8.98z'
      />
      <path
        fill='#EA4335'
        d='M16.85 15.096L4.243 22.432c-.198.116-.436.116-.634 0l3.057-3.058 10.184 10.186z'
      />
    </svg>
  )
}

type StoreBadgeProps = {
  href: string
  className?: string
}

export function AppStoreBadge({ href, className }: StoreBadgeProps) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(badgeClass, className)}
      aria-label='Download on the App Store'
    >
      <AppleIcon className='h-5 w-5 sm:h-6 sm:w-6' />
      <span className='text-xs font-semibold tracking-tight sm:hidden'>App Store</span>
      <span className='hidden flex-col items-start leading-none sm:flex'>
        <span className='text-[9px] font-medium text-white/75'>Download on the</span>
        <span className='mt-0.5 text-[13px] font-semibold tracking-tight'>App Store</span>
      </span>
    </a>
  )
}

export function GooglePlayBadge({ href, className }: StoreBadgeProps) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(badgeClass, className)}
      aria-label='Get it on Google Play'
    >
      <GooglePlayIcon className='h-5 w-5 sm:h-6 sm:w-6' />
      <span className='text-xs font-semibold tracking-tight sm:hidden'>Google Play</span>
      <span className='hidden flex-col items-start leading-none sm:flex'>
        <span className='text-[9px] font-medium uppercase tracking-wide text-white/75'>
          Get it on
        </span>
        <span className='mt-0.5 text-[13px] font-semibold tracking-tight'>Google Play</span>
      </span>
    </a>
  )
}
