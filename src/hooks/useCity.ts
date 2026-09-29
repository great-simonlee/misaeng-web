'use client'

import { usePathname } from 'next/navigation'
import { useCallback } from 'react'

import {
  cityPath,
  getCity,
  getCityFromPathname,
  type CityId,
} from '@lib/constants/cities'

export function useCity(): CityId {
  const pathname = usePathname()
  return getCityFromPathname(pathname)
}

export function useCityInfo() {
  const city = useCity()
  return getCity(city)
}

export function useCityPath() {
  const city = useCity()
  // effect 의존성에 쓰이므로 도시가 바뀔 때만 새 함수를 만든다.
  return useCallback((suffix = '') => cityPath(city, suffix), [city])
}
