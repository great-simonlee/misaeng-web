import { getRequestT } from '@lib/i18n/server'
import { staffAvatars } from '@lib/support/staffAvatars.server'
import { supportErrorResponse, supportJson, toUserConversation, toUserMessage } from '@lib/support/http.server'
import { getConversation, listMessages, markUserRead } from '@lib/support/service.server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { conversation, messages } and marks it read for the user. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const { id } = await context.params
    const row = await getConversation(id)
    if (!row || row.user_uid !== user.uid) return supportJson({ error: t('support.notFound') }, 404)
    const [messages, avatars] = await Promise.all([listMessages(row.id), staffAvatars()])
    await markUserRead(row)
    return supportJson({ conversation: { ...toUserConversation(row), unread: 0 }, messages: messages.map((m) => toUserMessage(m, avatars)) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
