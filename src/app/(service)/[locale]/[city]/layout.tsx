import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { isCityEnabled } from '@lib/cities/availability.server'
import { CITY_IDS, isCityId } from '@lib/constants/cities'

interface CityLayoutProps {
  children: ReactNode
  params: Promise<{ city: string }>
}

/**
 * 모든 도시를 목록에 둔다 (상위 [locale] 레이아웃이 dynamicParams = false라 빠진 도시는 무조건 404).
 * dc는 아래에서 설정을 no-store로 읽으므로 정적으로 굳지 않고 요청 때마다 공개 여부를 확인한다.
 */
export function generateStaticParams() {
  return CITY_IDS.map((city) => ({ city }))
}

export default async function CityLayout({
  children,
  params,
}: CityLayoutProps) {
  const { city } = await params
  if (!isCityId(city)) notFound()
  // 아직 열지 않은 도시(dc)는 설정을 확인한다. nyc·boston은 설정을 읽지 않아 정적 생성이 그대로 유지된다.
  if (city === 'dc') {
    // 설정 조회 실패를 기본값(닫힘)으로 바꾸는 getPointsConfig가 빌드 중 동적 신호까지 삼키지 않도록 먼저 요청 시점으로 넘긴다
    await connection()
    if (!(await isCityEnabled(city))) notFound()
  }
  return children
}
