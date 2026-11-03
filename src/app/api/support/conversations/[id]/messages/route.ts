import { getRequestT } from '@lib/i18n/server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import { supportErrorResponse, supportJson, toUserConversation, toUserMessage } from '@lib/support/http.server'
import { addUserMessage, getConversation, listMessages, markUserRead } from '@lib/support/service.server'
import { getSupportSettings, supportFeatureOn } from '@lib/support/settings.server'

import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

/** GET ?after=<ISO> → { conversation, messages } (only newer messages; realtime signal / polling refetch). */
export async function GET(request: Request, context: Context) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const { id } = await context.params
    const row = await getConversation(id)
    if (!row || row.user_uid !== user.uid) return supportJson({ error: t('support.notFound') }, 404)
    const messages = await listMessages(row.id, new URL(request.url).searchParams.get('after'))
    await markUserRead(row)
    return supportJson({ conversation: { ...toUserConversation(row), unread: 0 }, messages: messages.map(toUserMessage) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}

/** POST { body } → 201 { message }. A closed conversation opens again. */
export async function POST(request: Request, context: Context) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    const { id } = await context.params
    const row = await getConversation(id)
    if (!row || row.user_uid !== user.uid) return supportJson({ error: t('support.notFound') }, 404)
    const settings = await getSupportSettings()
    const enabled = supportFeatureOn(settings, row.kind === 'housing' ? 'support.enabled' : 'inquiry.enabled', user.email)
    if (!enabled) return supportJson({ error: t('support.disabled'), code: 'SUPPORT_DISABLED' }, 403)
    const body = ((await request.json().catch(() => null)) ?? {}) as { body?: string }
    const message = await addUserMessage({ uid: user.uid, email: user.email }, row, String(body.body ?? ''))
    const updated = await getConversation(row.id)
    return supportJson({ message: toUserMessage(message), conversation: updated ? toUserConversation(updated) : null }, 201)
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
