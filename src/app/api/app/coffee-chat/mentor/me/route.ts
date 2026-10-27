import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import {
  assertCoffeeChatEnabled,
  deleteMentor,
  getMyMentorState,
  parseMentorInput,
  saveMentor,
} from '@lib/points/coffeeChatMentors.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My coffee chat mentor card (app).
 * GET    → { eligible, offers: [{ submissionId, company }], mentor: Mentor & { active, submissionId, consentVersion } | null,
 *            consent: { text, version } }. Eligible = an approved 'offer' review verification.
 * PUT    { submissionId, role, intro, topics, active, agreed: true, consentVersion } → mentor (403 MENTOR_NOT_ELIGIBLE)
 * DELETE → { ok, declined } stop being a mentor; unanswered requests are declined (holds released).
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    return pointsJson(await getMyMentorState(user.uid, t))
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    await assertCoffeeChatEnabled()
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    return pointsJson(await saveMentor(user.uid, parseMentorInput(body)))
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}

export async function DELETE(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    const result = await deleteMentor(user.uid)
    return pointsJson({ ok: true, declined: result.declined })
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
