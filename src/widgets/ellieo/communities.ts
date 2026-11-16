import type { ComponentType } from 'react'

import {
  BagIcon,
  BookIcon,
  BowlIcon,
  BriefcaseIcon,
  BuildingIcon,
  ChatIcon,
  HomeIcon,
  PlaneIcon,
  UsersIcon,
} from '@widgets/ellieo/icons'

/**
 * Ellieo communities ("e/…", docs/design/ellieo-community.md): every board/screen is a community with a colored
 * round icon. Names/descriptions: `nav.ellieo.communities.<key>.name|description`, groups: `nav.ellieo.groups.<g>`.
 */
export type CommunityKey = 'rent' | 'roommates' | 'visa' | 'interviews' | 'companies' | 'jobs' | 'food' | 'market' | 'ask'
export type CommunityGroup = 'housing' | 'careers' | 'life'

export type EllieoCommunity = {
  key: CommunityKey
  group: CommunityGroup
  /** City-relative list path */
  path: string
  /** Extra paths that belong to this community (legacy routes) */
  alsoPaths?: string[]
  /** Board id for posts (null = not a post board: companies) */
  boardId: string | null
  /** Where "Post" goes (null = nobody posts here from the web) */
  writePath: string | null
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  color: string
}

export const ELLIEO_COMMUNITIES: EllieoCommunity[] = [
  { key: 'rent', group: 'housing', path: '/housing', boardId: 'housing', writePath: '/housing/new', icon: HomeIcon, color: '#1F5EFF' },
  { key: 'roommates', group: 'housing', path: '/roommate', boardId: 'roommate', writePath: '/roommate/new', icon: UsersIcon, color: '#3B82F6' },
  {
    key: 'visa',
    group: 'careers',
    path: '/status',
    alsoPaths: ['/cpt-opt', '/visa', '/green-card'],
    boardId: 'status',
    writePath: '/status/new',
    icon: PlaneIcon,
    color: '#0EA5E9',
  },
  { key: 'interviews', group: 'careers', path: '/job-review', boardId: 'job-review', writePath: '/job-review/new', icon: BookIcon, color: '#6366F1' },
  { key: 'companies', group: 'careers', path: '/companies', boardId: null, writePath: null, icon: BuildingIcon, color: '#475569' },
  { key: 'jobs', group: 'careers', path: '/companies/postings', boardId: null, writePath: null, icon: BriefcaseIcon, color: '#0F766E' },
  { key: 'food', group: 'life', path: '/food', boardId: 'food', writePath: '/food/new', icon: BowlIcon, color: '#F97316' },
  { key: 'market', group: 'life', path: '/marketplace', boardId: 'marketplace', writePath: '/marketplace/new', icon: BagIcon, color: '#DB2777' },
  { key: 'ask', group: 'life', path: '/anonymous', boardId: 'anonymous', writePath: '/anonymous/new', icon: ChatIcon, color: '#7C3AED' },
]

export const COMMUNITY_GROUPS: CommunityGroup[] = ['housing', 'careers', 'life']

/** The community a board id belongs to (legacy visa ids → Visa) */
export function communityForBoard(boardId: string | null | undefined): EllieoCommunity | null {
  if (!boardId) return null
  const id = boardId === 'cpt-opt' || boardId === 'visa' || boardId === 'green-card' ? 'status' : boardId
  return ELLIEO_COMMUNITIES.find((community) => community.boardId === id) ?? null
}

/** The community whose list page (or one of its sub-pages) is `pathname`, given a city path builder */
export function communityForPath(pathname: string, href: (suffix?: string) => string): EllieoCommunity | null {
  // Longest path first so /companies/postings beats /companies
  const candidates = ELLIEO_COMMUNITIES.flatMap((community) =>
    [community.path, ...(community.alsoPaths ?? [])].map((path) => ({ community, target: href(path) })),
  ).sort((a, b) => b.target.length - a.target.length)
  const hit = candidates.find(({ target }) => pathname === target || pathname.startsWith(`${target}/`))
  return hit?.community ?? null
}

/** Exact list page of a community (banner pages), else null */
export function communityListPage(pathname: string, href: (suffix?: string) => string): EllieoCommunity | null {
  return (
    ELLIEO_COMMUNITIES.find((community) =>
      [community.path, ...(community.alsoPaths ?? [])].some((path) => pathname === href(path)),
    ) ?? null
  )
}
