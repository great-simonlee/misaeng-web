import type { Metadata } from 'next'

import { MemberGate } from '@components/MemberGate'
import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { shareMetadata } from '@lib/share/shareMetadata'
import { PostingListScreen } from '@screens/nyc/PostingListScreen'

interface PostingsPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: PostingsPageProps): Promise<Metadata> {
  const { locale, city } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  const share = await shareMetadata('postings', locale, { path: `/${city}/companies/postings`, memberOnly: true })
  return { ...share, description: t('meta.postingsDescription', { brand: BRAND_CONFIG.name }) }
}

export default function PostingsPage() {
  return (
    <>
      <OpenInApp appPath='jobs/postings' />
      <MemberGate>
        <PostingListScreen />
      </MemberGate>
    </>
  )
}
