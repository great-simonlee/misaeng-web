import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { PostingListScreen } from '@screens/nyc/PostingListScreen'

interface PostingsPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: PostingsPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  return { description: t('meta.postingsDescription', { brand: BRAND_CONFIG.name }) }
}

export default function PostingsPage() {
  return <PostingListScreen />
}
