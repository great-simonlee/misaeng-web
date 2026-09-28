import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isCityId } from '@lib/constants/cities'
import { JobReviewGuestWriteScreen } from '@screens/nyc/JobReviewGuestWriteScreen'

interface JobReviewSharePageProps {
  params: Promise<{ city: string; board: string }>
}

export const metadata: Metadata = {
  title: '면접·취업 후기 남기기 | Misaeng',
  description:
    '가입 없이도 서류·인터뷰·결과를 단계별로 남길 수 있어요. 후기를 남기면 크레딧이 쌓이고, 현직자 커피챗에 사용할 수 있습니다.',
}

/** 현직자 초대용 — 가입 없이 면접·취업 후기 남기기 (/[city]/job-review/share) */
export default async function JobReviewSharePage({
  params,
}: JobReviewSharePageProps) {
  const { city, board } = await params
  if (!isCityId(city) || board !== 'job-review') notFound()

  return <JobReviewGuestWriteScreen />
}
