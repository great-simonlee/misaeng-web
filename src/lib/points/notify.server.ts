import { BRAND } from '@lib/brand'
import { notifyUsers } from '@lib/push/notify.server'
import type { Translate } from '@lib/i18n/translate'

/**
 * Points pushes (type 'credit' = the user's "points" switch; coffee chat changes are 'account', always sent).
 * Texts: api.points.push.* ; the points name comes from the `points` namespace.
 */

export const POINTS_NAME_KEY = BRAND === 'ellieo' ? 'points.nameEllieo' : 'points.name'

function reasonLabel(t: Translate, reason: string) {
  const key = `points.reasons.${reason}`
  const label = t(key)
  return label === key ? '' : label
}

export function notifyPointsEarned(uid: string, amount: number, reason: string, balance: number) {
  if (amount <= 0) return
  notifyUsers({
    type: 'credit',
    userIds: [uid],
    build: (t) => ({
      title: t('api.points.push.earned.title', { name: t(POINTS_NAME_KEY), amount }),
      body: t('api.points.push.earned.body', { reason: reasonLabel(t, reason), balance }),
      data: { type: 'credit' },
      threadId: 'credit',
    }),
  })
}

export function notifyPointsClawback(uid: string, amount: number, balance: number) {
  if (amount <= 0) return
  notifyUsers({
    type: 'credit',
    userIds: [uid],
    build: (t) => ({
      title: t('api.points.push.clawback.title', { name: t(POINTS_NAME_KEY), amount }),
      body: t('api.points.push.clawback.body', { balance }),
      data: { type: 'credit' },
      threadId: 'credit',
    }),
  })
}

export type CoffeeChatPushStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export function notifyCoffeeChat(uid: string, status: CoffeeChatPushStatus, requestId: string) {
  notifyUsers({
    type: 'account',
    userIds: [uid],
    build: (t) => ({
      title: t(`api.points.push.coffeeChat.${status}.title`),
      body: t(`api.points.push.coffeeChat.${status}.body`, { name: t(POINTS_NAME_KEY) }),
      data: { type: 'coffee_chat', requestId },
      threadId: 'coffee-chat',
    }),
  })
}
