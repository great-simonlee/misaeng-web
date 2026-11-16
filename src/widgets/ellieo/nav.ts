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
  PencilIcon,
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

/** Emoji per board (chips, composer, feed tags) */
export const BOARD_EMOJI: Record<NycCategoryId, string> = {
  housing: '🏠',
  status: '🛂',
  'job-review': '💼',
  roommate: '🤝',
  food: '🍜',
  anonymous: '💬',
  marketplace: '🛍️',
  events: '🎉',
}

/** Board accent colors (feed tags, rail icons): text on a soft tint of the same hue */
export const BOARD_TONE: Partial<Record<NycCategoryId, string>> = {
  status: '#1f5eff',
  housing: '#16b47e',
  roommate: '#e0579b',
  food: '#e8861a',
  'job-review': '#14121f',
  events: '#f0445a',
  anonymous: '#4a4660',
  marketplace: '#2a9fd6',
}

/** Line icon for any board id (composer headers, coming-soon, sheets); legacy visa ids → the visa board */
export function boardIcon(boardId: string): ComponentType<{ className?: string }> {
  const id = boardId === 'cpt-opt' || boardId === 'visa' || boardId === 'green-card' ? 'status' : boardId
  return ICONS[id as NycCategoryId] ?? PencilIcon
}
