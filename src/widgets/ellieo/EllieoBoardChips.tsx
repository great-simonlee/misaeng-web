'use client'

import { usePathname } from 'next/navigation'

import { useCityPath } from '@hooks/useCity'
import { communityListPage, type CommunityKey } from '@widgets/ellieo/communities'

export type EllieoTabPage = CommunityKey

/**
 * The community whose list page this is (null elsewhere). Those pages get the community banner (EllieoCommunityBanner)
 * in place of their own title/intro (docs/design/ellieo-community.md).
 */
export function useEllieoTabPage(): EllieoTabPage | null {
  const pathname = usePathname()
  const href = useCityPath()
  return communityListPage(pathname, href)?.key ?? null
}
