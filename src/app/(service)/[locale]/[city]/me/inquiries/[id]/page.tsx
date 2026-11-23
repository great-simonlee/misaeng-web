import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { MyInquiryThreadScreen } from '@screens/nyc/MyInquiryThreadScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'inquiries', { withoutCity: true, noindex: true })
}

export default async function NycMyInquiryThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MyInquiryThreadScreen id={id} />
}
