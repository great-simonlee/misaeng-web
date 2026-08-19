import { Skeleton, SkeletonCircle } from '@components/Skeleton'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { cn } from '@lib'

type Props = {
  className?: string
}

export function MyPageSkeleton({ className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]',
        className,
      )}
      role='status'
      aria-live='polite'
      aria-label='마이페이지를 불러오는 중이에요'
    >
      <div
        className={cn(
          'flex flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12',
          NYC_PAGE_SHELL_CLASS,
        )}
      >
        <div className='mb-6 lg:mb-8'>
          <Skeleton className='h-3 w-16' />
          <Skeleton className='mt-2.5 h-8 w-32' />
        </div>

        <div className='grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:items-start lg:gap-8'>
          <aside className='overflow-hidden rounded-[1.5rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04]'>
            <Skeleton className='h-20 rounded-none lg:h-24' />
            <div className='px-5 pb-6 pt-0 text-center sm:px-6'>
              <div className='relative -mt-10 inline-flex lg:-mt-12'>
                <SkeletonCircle className='size-20 lg:size-24' />
              </div>
              <Skeleton className='mx-auto mt-4 h-6 w-28' />
              <Skeleton className='mx-auto mt-2 h-4 w-40' />
            </div>
          </aside>

          <div className='min-w-0 space-y-6 lg:space-y-7'>
            <section>
              <Skeleton className='mb-3 h-4 w-12' />
              <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] lg:grid lg:grid-cols-2 lg:divide-x lg:divide-[#f0f1f3]'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'px-5 py-4',
                      index > 0 && 'border-t border-[#f0f1f3] lg:border-t-0',
                    )}
                  >
                    <Skeleton className='h-3 w-14' />
                    <Skeleton className='mt-2 h-5 w-24' />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Skeleton className='mb-3 h-4 w-10' />
              <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-3.5 px-5 py-4',
                      index < 2 && 'border-b border-[#f0f1f3]',
                    )}
                  >
                    <SkeletonCircle className='size-8 shrink-0' />
                    <div className='min-w-0 flex-1 space-y-2'>
                      <Skeleton className='h-4 w-20' />
                      <Skeleton className='h-3 w-32' />
                    </div>
                    <Skeleton className='h-3 w-12 shrink-0' />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
