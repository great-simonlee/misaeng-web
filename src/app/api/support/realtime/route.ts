import { getRequestT } from '@lib/i18n/server'
import { SERVER_SUPPORT_BRAND } from '@lib/support/brand'
import { supportErrorResponse, supportJson } from '@lib/support/http.server'
import { realtimeClientConfig, userTopic } from '@lib/support/realtime.server'
import { supportRest, eq } from '@lib/support/rest.server'
import { userInboxKey } from '@lib/support/service.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET → { socketUrl, anonKey, topic } while the user has a housing chat that is not closed, otherwise { topic: null }
 * (spec §11: only users with an open conversation connect). Signals carry no content.
 * GET ?conversation=<id> → the same while that conversation (the user's own, this brand) is on screen: the web board
 * thread refreshes on signals while it is open.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const conversation = new URL(request.url).searchParams.get('conversation')
    const open = conversation
      ? /^[0-9a-f-]{36}$/i.test(conversation)
        ? await supportRest<{ id: string }[]>(
            `support_conversations?id=${eq(conversation)}&user_uid=${eq(user.uid)}&brand=${eq(SERVER_SUPPORT_BRAND)}&select=id&limit=1`,
          )
        : []
      : await supportRest<{ id: string }[]>(
          `support_conversations?user_uid=${eq(user.uid)}&kind=eq.housing&status=neq.closed&select=id&limit=1`,
        )
    const config = realtimeClientConfig()
    if (!open?.length || !config) return supportJson({ topic: null })
    return supportJson({ ...config, topic: userTopic(await userInboxKey(user.uid)) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
