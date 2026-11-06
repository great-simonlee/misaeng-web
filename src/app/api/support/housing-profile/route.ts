import { getRequestT } from '@lib/i18n/server'
import { parseHousingProfile, supportErrorResponse, supportJson } from '@lib/support/http.server'
import { getHousingProfile, saveHousingProfile } from '@lib/support/service.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET → { profile | null, skipConfirm: boolean, updatedAt } — skipConfirm = "일주일 동안 묻지 않기" still active
 * (start the chat with the saved profile without the confirm screen).
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const row = await getHousingProfile(user.uid)
    const skipConfirm = Boolean(row?.skip_confirm_until && Date.parse(row.skip_confirm_until) > Date.now())
    return supportJson({ profile: row?.profile ?? null, skipConfirm, updatedAt: row?.updated_at ?? null })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}

/** PUT { profile } → { profile } (edit any time from My page; keeps the "묻지 않기" period). */
export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const body = ((await request.json().catch(() => null)) ?? {}) as { profile?: unknown }
    const profile = parseHousingProfile(body.profile)
    if (!profile) return supportJson({ error: t('support.profileInvalid'), code: 'PROFILE_INVALID' }, 400)
    await saveHousingProfile(user.uid, profile)
    return supportJson({ profile })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
