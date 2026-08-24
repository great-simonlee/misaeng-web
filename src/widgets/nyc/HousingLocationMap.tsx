import { cn } from '@lib'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'

interface HousingLocationMapProps {
  listingId: string
  address: string
  neighborhood: string
  className?: string
}

export function HousingLocationMap({
  listingId,
  address,
  neighborhood,
  className,
}: HousingLocationMapProps) {
  const mapSrc = `/api/housing/${encodeURIComponent(listingId)}/map`
  const externalHref = `/api/housing/${encodeURIComponent(listingId)}/map?open=1`

  return (
    <BoardSurface
      as='section'
      className={cn('overflow-hidden', className)}
    >
      <div className='flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5'>
        <div className='min-w-0'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]'>
            위치
          </p>
          <p className='mt-1 truncate text-[14px] font-semibold text-[var(--foreground)]'>
            {address}
          </p>
          <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
            {neighborhood}, New York
          </p>
        </div>
        <a
          href={externalHref}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0 text-[12px] font-semibold text-[var(--brand)] underline-offset-2 touch-manipulation hover:underline'
        >
          지도 앱에서 보기
        </a>
      </div>
      <div className='relative mt-3 aspect-[16/10] overflow-hidden bg-[#e8eaee] sm:aspect-[16/9]'>
        <iframe
          title={`${address} 위치 지도`}
          src={mapSrc}
          className='absolute inset-0 h-full w-full border-0'
          loading='lazy'
          referrerPolicy='no-referrer-when-downgrade'
          allowFullScreen
        />
      </div>
    </BoardSurface>
  )
}
