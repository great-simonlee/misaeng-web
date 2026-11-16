import { SERVER_SUPPORT_BRAND } from '@lib/support/brand'
import { userUnreadTotal } from '@lib/support/service.server'
import { unreadCount } from './inbox.server'

/**
 * The number on the app icon (홈 화면 배지): unread notifications (inbox) + unread support/housing messages.
 * Coffee chats and career questions already land in the inbox, so they are not counted twice.
 */
export async function appBadgeCount(uid: string): Promise<number> {
  const [notifications, messages] = await Promise.all([
    unreadCount(uid).catch(() => 0),
    userUnreadTotal(uid, SERVER_SUPPORT_BRAND).catch(() => 0),
  ])
  return notifications + messages
}
