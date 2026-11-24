import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { createFamilyRequest } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/family/requests {email} — a parent asks a child (by school or personal email) to link. The sender becomes a
 * parent account when eligible. Same answer whether or not the email is a member.
 * → 201 { request: { id, email, status, createdAt, expiresAt } } (an existing pending request for the email: 200)
 * Errors: 400 INVALID_EMAIL | OWN_EMAIL · 403 ACCOUNT_SUSPENDED · 409 PARENT_ACCOUNT_INELIGIBLE | ALREADY_LINKED ·
 * 429 TOO_MANY_PENDING (5) | DAILY_LIMIT (10/day) · 503 SETUP_REQUIRED
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    const body = ((await request.json().catch(() => null)) || {}) as { email?: unknown }
    const result = await createFamilyRequest(user, { email: body.email, locale: await getRequestLocale(request) })
    return familyJson({ request: result.request }, result.created ? 201 : 200)
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
