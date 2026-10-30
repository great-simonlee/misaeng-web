import type { ComponentType } from 'react'

import { NYC_CATEGORIES, type NycCategoryId } from '@lib/constants/nyc'
import {
  BagIcon,
  BowlIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatIcon,
  KeyIcon,
  PassportIcon,
  UsersIcon,
} from '@widgets/ellieo/icons'

/**
 * Ellieo navigation model. Same boards and order of importance as misaeng.com/nyc (brief §8),
 * with an icon per board so short labels still read well in Vietnamese.
 * Labels: `nav.ellieo.short.<id>` (menus) and `community.categories.<id>.title|description` (tiles).
 */
export type EllieoBoard = {
  id: NycCategoryId
  path: string
  icon: ComponentType<{ className?: string }>
  available: boolean
  /** shown in the desktop header row */
  primary: boolean
}

const ICONS: Record<NycCategoryId, ComponentType<{ className?: string }>> = {
  housing: KeyIcon,
  events: CalendarIcon,
  food: BowlIcon,
  marketplace: BagIcon,
  status: PassportIcon,
  'job-review': BriefcaseIcon,
  roommate: UsersIcon,
  anonymous: ChatIcon,
}

/** Order on Ellieo: housing and visa first (what new international students need most) */
const ORDER: NycCategoryId[] = [
  'housing',
  'status',
  'job-review',
  'roommate',
  'food',
  'anonymous',
  'marketplace',
  'events',
]

export const ELLIEO_BOARDS: EllieoBoard[] = ORDER.map((id) => {
  const category = NYC_CATEGORIES.find((item) => item.id === id)!
  return {
    id,
    path: category.href,
    icon: ICONS[id],
    available: category.available,
    primary: category.available,
  }
})
