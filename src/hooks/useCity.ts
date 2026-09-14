'use client'

import { usePathname } from 'next/navigation'

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
  return (suffix = '') => cityPath(city, suffix)
}
