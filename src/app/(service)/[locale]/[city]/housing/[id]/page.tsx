import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { BRAND_CONFIG } from '@lib/brand'
import { getListingDisplayAddress, getListingGalleryImages } from '@lib/housing/listing'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { HousingDetailScreen } from '@screens/nyc/HousingDetailScreen'

interface HousingDetailPageProps {
  params: Promise<{ id: string }>
}

// 카카오톡·iMessage 링크 미리보기: 매물 주소·지역 + 첫 사진. 못 불러오면 사이트 기본값(layout)을 쓴다.
// 탭 제목은 사이트 기본값 그대로 둔다 (미리보기 제목만 바꾼다).
export async function generateMetadata({ params }: HousingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const listing = await getStoredHousingListing(id).catch(() => null)
  if (!listing || listing.status === 'closed') return {}
  const address = getListingDisplayAddress(listing)
  const area = listing.property.area?.trim()
  const title = area && area !== address ? `${address} · ${area}` : address
  const description = listing.description.replace(/\s+/g, ' ').trim().slice(0, 140)
  const image = getListingGalleryImages(listing)[0]
  return {
    ...(description ? { description } : {}),
    openGraph: {
      title,
      siteName: BRAND_CONFIG.name,
      ...(description ? { description } : {}),
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, ...(image ? { images: [image] } : {}) },
  }
}

export default async function HousingDetailPage({
  params,
}: HousingDetailPageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <HousingDetailScreen postId={id} />
    </Suspense>
  )
}
