import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { EllieoCommunitiesScreen } from '@screens/ellieo/EllieoCommunitiesScreen'

/** Ellieo "Communities" tab (docs/design/ellieo-community.md); Misaeng has no such page */
export default function CommunitiesPage() {
  if (BRAND_CONFIG.theme !== 'ellieo') notFound()
  return <EllieoCommunitiesScreen />
}
