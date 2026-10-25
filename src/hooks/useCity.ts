'use client'

import { usePathname } from 'next/navigation'
import { useCallback } from 'react'

import {
  cityPath,
  getCity,
  getCityFromPathname,
  type CityId,
} from '@lib/constants/cities'
import { useLocale } from '@lib/i18n/client'
import { localePath } from '@lib/i18n/paths'

export function useCity(): CityId {
  const pathname = usePathname()
  return getCityFromPathname(pathname)
}

export function useCityInfo() {
  const city = useCity()
  return getCity(city)
}

/** 현재 도시·언어 기준 경로. `href('/food')` → `/nyc/food` 또는 `/vi/nyc/food` */
export function useCityPath() {
  const city = useCity()
  const locale = useLocale()
  // effect 의존성에 쓰이므로 도시·언어가 바뀔 때만 새 함수를 만든다.
  return useCallback(
    (suffix = '') => localePath(locale, cityPath(city, suffix)),
    [city, locale],
  )
}
