import type { Metadata } from 'next'

import { CreditReviewsScreen } from '@screens/nyc/CreditReviewsScreen'

export const metadata: Metadata = {
  title: '크레딧 리뷰 | Misaeng NYC',
  description: '최종 결과 후기 추가 크레딧 요청을 검토합니다.',
}

export default function CreditReviewsPage() {
  return <CreditReviewsScreen />
}
