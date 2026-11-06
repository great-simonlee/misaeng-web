'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { BottomSheet } from '@components'
import { cn } from '@lib'
import {
  CITY_IDS,
  getCity,
  replaceCityInPath,
  type CityId,
} from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'

/** 늘 열려 있는 도시. 나머지(dc)는 /api/cities가 공개 중이라고 할 때만 보여 준다 */
const ALWAYS_OPEN: readonly CityId[] = ['nyc', 'boston']

let enabledCitiesRequest: Promise<CityId[]> | null = null

function loadEnabledCities(): Promise<CityId[]> {
  enabledCitiesRequest ??= fetch('/api/cities')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { cities?: string[] } | null) =>
      CITY_IDS.filter((id) => ALWAYS_OPEN.includes(id) || Boolean(data?.cities?.includes(id))),
    )
    .catch(() => {
      enabledCitiesRequest = null
      return [...ALWAYS_OPEN]
    })
  return enabledCitiesRequest
}

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
  const t = useT('nav')
  const [cities, setCities] = useState<readonly CityId[]>(ALWAYS_OPEN)

  useEffect(() => {
    if (!open) return
    let alive = true
    void loadEnabledCities().then((ids) => {
      if (alive) setCities(ids)
    })
    return () => {
      alive = false
    }
  }, [open])

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
      title={t('selectCity')}
      scrollable={false}
    >
      <div className='space-y-2 px-4 pb-4'>
        {cities.map((id) => {
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
                  {info.name}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[12px]',
                    active ? 'text-white/70' : 'text-[var(--muted)]',
                  )}
                >
                  {info.regions}
                </span>
              </span>
              {active ? (
                <span className='text-[12px] font-semibold'>{t('currentCity')}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
