import type { NycCommunityBoardId } from '@lib/constants/nyc'

/** Community board → the post_type used in analytics events (shared/tracking/events.json). */
export function analyticsPostType(board: NycCommunityBoardId | string) {
  switch (board) {
    case 'job-review':
    case 'status':
    case 'cpt-opt':
    case 'visa':
    case 'green-card':
      return 'review'
    case 'food':
      return 'food'
    case 'marketplace':
      return 'market'
    case 'roommate':
      return 'roommate'
    case 'sublet':
      return 'sublet'
    default:
      return 'community'
  }
}
