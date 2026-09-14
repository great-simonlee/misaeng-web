import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { CITY_IDS, isCityId } from '@lib/constants/cities'

interface CityLayoutProps {
  children: ReactNode
  params: Promise<{ city: string }>
}

export function generateStaticParams() {
  return CITY_IDS.map((city) => ({ city }))
}

export default async function CityLayout({
  children,
  params,
}: CityLayoutProps) {
  const { city } = await params
  if (!isCityId(city)) notFound()
  return children
}
