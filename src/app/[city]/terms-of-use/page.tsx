import type { Metadata } from 'next'

import { TermsOfUseScreen } from '@screens/nyc/TermsOfUseScreen'

export const metadata: Metadata = {
  title: 'Terms of Use | Misaeng NYC',
  description:
    'Misaeng NYC 이용약관. 커뮤니티 이용, 익명게시판, 하우징·룸메이트, 계정, 책임 제한 등 서비스 이용 조건을 안내합니다.',
}

export default function NycTermsOfUsePage() {
  return <TermsOfUseScreen />
}
