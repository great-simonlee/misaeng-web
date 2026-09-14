import type { Metadata } from 'next'

import { CreditScreen } from '@screens/credit/CreditScreen'

export const metadata: Metadata = {
  title: '커뮤니티 크레딧 | Misaeng NYC',
  description:
    'Misaeng NYC 커뮤니티 크레딧 적립·사용·한도·FAQ. 맛집·OPT·취업 후기와 댓글로 크레딧을 모아 커피챗, 변호사 자문, 커리어 멘토링 등 보상을 신청하세요.',
}

export default function NycCreditPage() {
  return <CreditScreen />
}
