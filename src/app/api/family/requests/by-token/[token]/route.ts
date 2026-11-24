import { getRequestT } from '@lib/i18n/server'
import { getRequestByToken } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/family/requests/by-token/{token} (no login; the mail link) →
 * { id, parentNickname, status: pending|accepted|declined|expired|canceled, expiresAt } · 404 NOT_FOUND.
 * The page then signs the child in and calls POST /api/family/requests/{id}/accept.
 */
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const t = await getRequestT(request, 'api')
  try {
    const { token } = await context.params
    const found = await getRequestByToken(token)
    if (!found) return familyJson({ error: t('family.requestNotFound'), code: 'NOT_FOUND' }, 404)
    return familyJson(found)
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
