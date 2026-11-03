import { getRequestT } from '@lib/i18n/server'
import { supportErrorResponse, supportJson } from '@lib/support/http.server'
import { userUnreadTotal } from '@lib/support/service.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { count } unread staff replies over all of the user's conversations. */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ count: 0 })
    return supportJson({ count: await userUnreadTotal(user.uid) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
