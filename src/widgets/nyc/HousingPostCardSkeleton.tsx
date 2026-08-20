import { Skeleton } from '@components/Skeleton'
import { cn } from '@lib'

type HousingPostCardSkeletonProps = {
  className?: string
}

/** 하우징 카드와 같은 레이아웃의 shimmer 플레이스홀더 */
export function HousingPostCardSkeleton({
  className,
}: HousingPostCardSkeletonProps) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] sm:rounded-xl',
        className,
      )}
      aria-hidden
    >
      <Skeleton className='aspect-[4/3] w-full rounded-none sm:aspect-[3/2]' />
      <div className='flex flex-1 flex-col px-3.5 py-3.5 sm:px-3 sm:py-2.5'>
        <div className='flex min-h-[2rem] items-center justify-between gap-2 sm:min-h-[1.75rem]'>
          <Skeleton className='h-4 w-[55%] sm:h-3.5' />
          <Skeleton className='h-4 w-16 sm:h-3.5' />
        </div>
        <Skeleton className='mt-2 h-3.5 w-[72%] sm:mt-1.5 sm:h-3' />
        <div className='mt-2.5 space-y-1.5 border-t border-[#f0f1f3] pt-2.5 sm:mt-2 sm:pt-2'>
          <div className='flex items-center justify-between gap-2 px-0.5'>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-3 w-14' />
          </div>
          <div className='flex items-center justify-between gap-2 px-0.5'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-3 w-12' />
          </div>
        </div>
      </div>
    </article>
  )
}

type HousingPostCardSkeletonGridProps = {
  count?: number
  className?: string
}

export function HousingPostCardSkeletonGrid({
  count = 8,
  className,
}: HousingPostCardSkeletonGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-3.5',
        className,
      )}
      role='status'
      aria-live='polite'
      aria-label='매물 불러오는 중'
    >
      {Array.from({ length: count }, (_, index) => (
        <HousingPostCardSkeleton key={index} />
      ))}
      <span className='sr-only'>매물을 불러오는 중입니다</span>
    </div>
  )
}
