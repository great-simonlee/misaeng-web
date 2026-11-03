import { getRequestT } from '@lib/i18n/server'
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
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const open = await supportRest<{ id: string }[]>(
      `support_conversations?user_uid=${eq(user.uid)}&kind=eq.housing&status=neq.closed&select=id&limit=1`,
    )
    const config = realtimeClientConfig()
    if (!open?.length || !config) return supportJson({ topic: null })
    return supportJson({ ...config, topic: userTopic(await userInboxKey(user.uid)) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
