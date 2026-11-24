import { getRequestT } from '@lib/i18n/server'
import { digestOptedOut, setDigestOptOut } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { optedOut } · PUT {optedOut: boolean} → { optedOut } — the parent digest switch (app settings / web). */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    return familyJson({ optedOut: await digestOptedOut(user.uid) })
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}

export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    const body = ((await request.json().catch(() => null)) || {}) as { optedOut?: unknown }
    if (typeof body.optedOut !== 'boolean') return familyJson({ error: 'optedOut must be a boolean.', code: 'INVALID' }, 400)
    return familyJson(await setDigestOptOut(user.uid, body.optedOut))
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
