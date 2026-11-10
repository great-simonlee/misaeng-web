import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { assertCoffeeChatEnabled, listChats } from '@lib/points/coffeeChatMentors.server'
import { listQuestions } from '@lib/points/reviewQuestions.server'
import { appBadgeCount } from '@lib/push/badge.server'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * What the signed-in user should look at (launch modal, My page dots, app icon badge):
 * - coffeeChats: received requests waiting for my times + sent chats waiting for me to pick a time
 *   (coffeeChatsReceived = the received part, so the app opens the 받은 tab first)
 * - careerQuestions: questions on my reviews waiting for my answer
 * - badge: unread notifications + unread messages (the app icon number)
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const uid = user.uid
  const coffeeChats = async () => {
    try {
      await assertCoffeeChatEnabled()
    } catch {
      return { received: 0, sent: 0 }
    }
    const [received, sent] = await Promise.all([listChats(uid, 'received', t), listChats(uid, 'sent', t)])
    return {
      received: received.filter((chat) => chat.stage === 'awaiting_mentor').length,
      sent: sent.filter((chat) => chat.stage === 'awaiting_requester').length,
    }
  }
  const careerQuestions = async () =>
    (await listQuestions(uid, 'received')).filter((question) => question.status === 'pending').length
  const [chats, questions, badge] = await Promise.all([
    coffeeChats().catch(() => ({ received: 0, sent: 0 })),
    careerQuestions().catch(() => 0),
    appBadgeCount(uid),
  ])
  return NextResponse.json(
    {
      coffeeChats: chats.received + chats.sent,
      coffeeChatsReceived: chats.received,
      careerQuestions: questions,
      badge,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
