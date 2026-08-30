import type { Metadata } from 'next'

import { CoffeeChatRequestScreen } from '@screens/nyc/CoffeeChatRequestScreen'

export const metadata: Metadata = {
  title: '커피챗 신청 | Misaeng NYC',
  description:
    '관심 분야 현직자 또는 석·박·포닥과 커뮤니티 크레딧으로 커피챗을 신청하세요.',
}

export default function CoffeeChatRequestPage() {
  return <CoffeeChatRequestScreen />
}
