import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import {
  getListingArea,
  getListingDisplayAddress,
  getListingImages,
  getListingUnitRent,
  getListingUnitType,
} from '@lib/housing/listing'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { loadPageListing } from '@lib/seo/content.server'
import { PER_PAGE_METADATA, pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'
import { shareMetadata } from '@lib/share/shareMetadata'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { HousingDetailScreen } from '@screens/nyc/HousingDetailScreen'

interface HousingDetailPageProps {
  params: Promise<{ locale: string; city: string; id: string }>
}

export async function generateMetadata({ params }: HousingDetailPageProps): Promise<Metadata> {
  const { locale, city, id } = await params
  if (!PER_PAGE_METADATA) return misaengShareMetadata(locale, city, id)
  const viewLocale = serviceLocale(locale)
  const listing = await loadPageListing(id, viewLocale)
  if (!listing) return {}
  const t = await getT(viewLocale, 'common.seo')
  const bedrooms = listing.unit.bedrooms
  const rooms = bedrooms > 0 ? t('bedrooms', { count: bedrooms }) : t('studio')
  const area = getListingArea(listing) || 'New York'
  const price = Math.round(getListingUnitRent(listing)).toLocaleString('en-US')
  const params2 = { rooms, area, price, address: getListingDisplayAddress(listing), brand: BRAND_CONFIG.name }
  return pageMetadata({
    locale,
    path: `/${city}/housing/${encodeURIComponent(id)}`,
    title: t('listingTitle', params2),
    description: listing.description || t('listingDescription', params2),
    image: getListingImages(listing)[0] ?? null,
    type: 'article',
  })
}

// Misaeng: 카카오톡·iMessage 링크 미리보기: "미생에서 방을 공유했어요!" + 지역·방 타입·월세 요약 + 통일된 미리보기 이미지.
// 탭 제목은 사이트 기본값 그대로 둔다 (미리보기만 바꾼다).
async function misaengShareMetadata(locale: string, city: string, id: string): Promise<Metadata> {
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
  const { locale, id } = await params
  // Ellieo: a removed or closed listing is a real 404 (status code), not only an empty screen
  if (PER_PAGE_METADATA && !(await loadPageListing(id, serviceLocale(locale)))) notFound()
  return (
    <>
      <Suspense fallback={<LoadingState fullPage />}>
        <HousingDetailScreen postId={id} />
      </Suspense>
      <OpenInApp appPath={`housing/${id}`} />
    </>
  )
}
