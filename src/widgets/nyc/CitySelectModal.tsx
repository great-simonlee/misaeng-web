'use client'

import { usePathname, useRouter } from 'next/navigation'

import { BottomSheet } from '@components'
import { cn } from '@lib'
import {
  CITY_IDS,
  getCity,
  replaceCityInPath,
  type CityId,
} from '@lib/constants/cities'

type CitySelectModalProps = {
  open: boolean
  onClose: () => void
  currentCity: CityId
}

export function CitySelectModal({
  open,
  onClose,
  currentCity,
}: CitySelectModalProps) {
  const router = useRouter()
  const pathname = usePathname()

  function selectCity(nextCity: CityId) {
    if (nextCity !== currentCity) {
      router.push(replaceCityInPath(pathname, nextCity))
    }
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title='도시 선택'
      scrollable={false}
    >
      <div className='space-y-2 px-4 pb-4'>
        {CITY_IDS.map((id) => {
          const info = getCity(id)
          const active = id === currentCity
          return (
            <button
              key={id}
              type='button'
              onClick={() => selectCity(id)}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left ring-1 touch-manipulation transition',
                active
                  ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
                  : 'bg-white text-[var(--foreground)] ring-black/[0.08]',
              )}
            >
              <span>
                <span className='block text-[15px] font-semibold'>
                  {info.shortLabel}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[12px]',
                    active ? 'text-white/70' : 'text-[var(--muted)]',
                  )}
                >
                  {info.name}
                </span>
              </span>
              {active ? (
                <span className='text-[12px] font-semibold'>현재</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
