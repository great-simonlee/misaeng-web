import type { Metadata } from 'next'
import { cityPageTitle, pageName } from '@lib/i18n/cityMetadata.server'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import { getListingArea, getListingUnitRent, getListingUnitType } from '@lib/housing/listing'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { shareMetadata } from '@lib/share/shareMetadata'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { HousingDetailScreen } from '@screens/nyc/HousingDetailScreen'

interface HousingDetailPageProps {
  params: Promise<{ locale: string; city: string; id: string }>
}

// 카카오톡·iMessage 링크 미리보기: "미생에서 방을 공유했어요!" + 지역·방 타입·월세 요약 + 통일된 미리보기 이미지.
// 탭 제목: "지역 · 하우징 · 도시 | 미생" (11-23).
export async function generateMetadata({ params }: HousingDetailPageProps): Promise<Metadata> {
  const { locale, city, id } = await params
  const path = `/${city}/housing/${id}`
  const listing = await getStoredHousingListing(id).catch(() => null)
  const housing = await pageName(locale, 'housing')
  if (!listing || listing.status === 'closed') {
    return { ...(await shareMetadata('housing', locale, { path })), title: await cityPageTitle(locale, city, housing) }
  }
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale)
  const unitType = getListingUnitType(listing)
  const rent = getListingUnitRent(listing)
  const description = [
    getListingArea(listing)?.trim(),
    unitType ? t(`housing.unitTypes.${unitType}`) : null,
    rent > 0 ? `$${rent.toLocaleString('en-US')}${t('common.share.perMonth')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const area = getListingArea(listing)?.trim()
  return {
    ...(await shareMetadata('housing', locale, { path, description })),
    title: await cityPageTitle(locale, city, area ? `${area} · ${housing}` : housing),
  }
}

export default async function HousingDetailPage({
  params,
}: HousingDetailPageProps) {
  const { id } = await params
  return (
    <>
      <Suspense fallback={<LoadingState fullPage />}>
        <HousingDetailScreen postId={id} />
      </Suspense>
      <OpenInApp appPath={`housing/${id}`} />
    </>
  )
}
