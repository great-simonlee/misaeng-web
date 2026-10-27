import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { saveSchoolRegistrationRequest } from '@lib/supabase/schoolRegistry.server'
import { isValidSchoolDomain, normalizeSchoolDomain } from '@lib/utils/schoolDomain'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stores a "school not listed" request from the web form so the ERP lists it (Misaeng → Schools).
 * The web still mails the team from the browser (src/lib/api/schoolRegistrationRequest.ts).
 * POST { schoolName, emailDomain } → 200 { ok } · 401 · 400 · 502 when it could not be stored.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request)
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('api.common.loginRequired') }, { status: 401 })

  const body = ((await request.json().catch(() => null)) || {}) as { schoolName?: string; emailDomain?: string }
  const schoolName = String(body.schoolName || '').trim()
  const emailDomain = normalizeSchoolDomain(String(body.emailDomain || ''))
  if (schoolName.length < 2) {
    return NextResponse.json({ error: t('me.verification.school.errors.nameRequired') }, { status: 400 })
  }
  if (!isValidSchoolDomain(emailDomain)) {
    return NextResponse.json({ error: t('me.verification.school.errors.invalidDomain') }, { status: 400 })
  }

  try {
    await saveSchoolRegistrationRequest({
      uid: user.uid,
      requesterEmail: user.email,
      schoolName,
      emailDomain,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('School registration request save error:', error)
    return NextResponse.json({ error: t('me.verification.school.errors.registrationFailed') }, { status: 502 })
  }
}
