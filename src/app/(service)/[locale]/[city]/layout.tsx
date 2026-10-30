import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { isCityEnabled } from '@lib/cities/availability.server'
import { CITY_IDS, isCityId } from '@lib/constants/cities'

interface CityLayoutProps {
  children: ReactNode
  params: Promise<{ city: string }>
}

/** dc는 공개 여부가 설정에 달려 있어 미리 만들지 않고 요청 때 그린다 */
export function generateStaticParams() {
  return CITY_IDS.filter((city) => city !== 'dc').map((city) => ({ city }))
}

export default async function CityLayout({
  children,
  params,
}: CityLayoutProps) {
  const { city } = await params
  if (!isCityId(city)) notFound()
  // 아직 열지 않은 도시(dc)는 설정을 확인한다. nyc·boston은 설정을 읽지 않아 정적 생성이 그대로 유지된다.
  if (city === 'dc' && !(await isCityEnabled(city))) notFound()
  return children
}
