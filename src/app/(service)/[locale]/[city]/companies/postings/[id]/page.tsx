import type { Metadata } from 'next'

import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { shareMetadata } from '@lib/share/shareMetadata'
import { getPublicPosting } from '@lib/supabase/jobPostings.server'
import { localizePosting } from '@lib/translations/postings'
import { PostingShareScreen } from '@screens/nyc/PostingShareScreen'

interface PostingPageProps {
  params: Promise<{ locale: string; city: string; id: string }>
}

const pageLocale = (locale: string) => (isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale)

// 앱에서 공유한 공고 하나. 링크 미리보기는 "Google · Associate Customer Engineer" + 회사 로고.
export async function generateMetadata({ params }: PostingPageProps): Promise<Metadata> {
  const { locale, city, id } = await params
  const t = await getT(pageLocale(locale), 'companies')
  const posting = await getPublicPosting(id).catch(() => null)
  const path = `/${city}/companies/postings/${id}`
  if (!posting) {
    const share = await shareMetadata('postings', locale, { path })
    return { ...share, description: t('meta.postingsDescription', { brand: BRAND_CONFIG.name }) }
  }
  const { summary, title, company } = localizePosting(posting, pageLocale(locale))
  const share = await shareMetadata('posting', locale, {
    path,
    title: `${company.name} · ${title}`,
    logoUrl: company.logoUrl,
  })
  return { ...share, description: summary.overview[0] || t('meta.postingsDescription', { brand: BRAND_CONFIG.name }) }
}

export default async function PostingPage({ params }: PostingPageProps) {
  const { locale, id } = await params
  const posting = await getPublicPosting(id).catch(() => null)
  return (
    <>
      <OpenInApp appPath={`posting/${id}`} />
      <PostingShareScreen posting={posting ? localizePosting(posting, pageLocale(locale)) : null} />
    </>
  )
}
