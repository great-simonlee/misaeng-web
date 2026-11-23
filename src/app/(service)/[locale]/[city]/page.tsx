import type { Metadata } from 'next'

import { isCityId } from '@lib/constants/cities'
import { cityPageMetadata, metadataLocale } from '@lib/i18n/cityMetadata.server'
import { getT } from '@lib/i18n/server'
import { NycHubScreen } from '@screens/nyc/NycHubScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(metadataLocale(locale), 'hub')
  return cityPageMetadata({ locale, city, description: t(`cities.${isCityId(city) ? city : 'nyc'}.description`) })
}

export default function NycPage() {
  return <NycHubScreen />
}
