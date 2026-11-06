import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { BRAND_CONFIG } from '@lib/brand'
import { getListingArea, getListingDisplayAddress, getListingImages, getListingUnitRent } from '@lib/housing/listing'
import { getT } from '@lib/i18n/server'
import { loadPageListing } from '@lib/seo/content.server'
import { PER_PAGE_METADATA, pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'
import { HousingDetailScreen } from '@screens/nyc/HousingDetailScreen'

interface HousingDetailPageProps {
  params: Promise<{ locale: string; city: string; id: string }>
}

export async function generateMetadata({ params }: HousingDetailPageProps): Promise<Metadata> {
  if (!PER_PAGE_METADATA) return {}
  const { locale, city, id } = await params
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

export default async function HousingDetailPage({
  params,
}: HousingDetailPageProps) {
  const { locale, id } = await params
  // Ellieo: a removed or closed listing is a real 404 (status code), not only an empty screen
  if (PER_PAGE_METADATA && !(await loadPageListing(id, serviceLocale(locale)))) notFound()
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <HousingDetailScreen postId={id} />
    </Suspense>
  )
}
