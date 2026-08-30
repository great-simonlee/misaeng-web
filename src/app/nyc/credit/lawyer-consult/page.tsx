import type { Metadata } from 'next'

import { LawyerConsultRequestScreen } from '@screens/nyc/LawyerConsultRequestScreen'

export const metadata: Metadata = {
  title: '이민 변호사 자문 신청 | Misaeng NYC',
  description:
    'CPT·OPT·비자·영주권 등 이민 변호사 자문을 커뮤니티 크레딧으로 신청하세요.',
}

export default function LawyerConsultRequestPage() {
  return <LawyerConsultRequestScreen />
}
