import type { Metadata } from 'next'

import { PrivacyPolicyScreen } from '@screens/nyc/PrivacyPolicyScreen'

export const metadata: Metadata = {
  title: 'Privacy Policy | Misaeng NYC',
  description:
    'Misaeng NYC 개인정보처리방침. 수집·이용·보관·공유, 익명게시판, 쿠키, 이용자 권리 및 문의 방법을 안내합니다.',
}

export default function NycPrivacyPolicyPage() {
  return <PrivacyPolicyScreen />
}
