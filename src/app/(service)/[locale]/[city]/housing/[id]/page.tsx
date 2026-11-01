import type { Metadata } from 'next'
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
// 탭 제목은 사이트 기본값 그대로 둔다 (미리보기만 바꾼다).
export async function generateMetadata({ params }: HousingDetailPageProps): Promise<Metadata> {
  const { locale, city, id } = await params
  const path = `/${city}/housing/${id}`
  const listing = await getStoredHousingListing(id).catch(() => null)
  if (!listing || listing.status === 'closed') return shareMetadata('housing', locale, { path })
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
  return shareMetadata('housing', locale, { path, description })
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
