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

/** Board accent colors (feed tags, rail icons): text on a soft tint of the same hue */
export const BOARD_TONE: Partial<Record<NycCategoryId, string>> = {
  status: '#1f5eff',
  housing: '#0b8f6a',
  roommate: '#7a4cff',
  food: '#d4870a',
  'job-review': '#0e1a2f',
  events: '#d6336c',
  anonymous: '#5b6779',
  marketplace: '#12a4c7',
}
