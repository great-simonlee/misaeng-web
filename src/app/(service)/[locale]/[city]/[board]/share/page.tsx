import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { JobReviewGuestWriteScreen } from '@screens/nyc/JobReviewGuestWriteScreen'

interface JobReviewSharePageProps {
  params: Promise<{ locale: string; city: string; board: string }>
}

export async function generateMetadata({
  params,
}: JobReviewSharePageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getT(locale, 'community')
  return { description: t('share.metaDescription') }
}

/** 현직자 초대용 — 가입 없이 면접·취업 후기 남기기 (/[city]/job-review/share) */
export default async function JobReviewSharePage({
  params,
}: JobReviewSharePageProps) {
  const { locale, city, board } = await params
  if (!isLocale(locale) || !isCityId(city) || board !== 'job-review') notFound()

  return <JobReviewGuestWriteScreen />
}
