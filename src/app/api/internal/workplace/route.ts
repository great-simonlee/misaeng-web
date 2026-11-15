import { NextResponse } from 'next/server'

import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { listStoredWorkplaceVerifications } from '@lib/supabase/workplaceVerification.server'
import { describeWorkplaceRequest } from '@lib/verification/workplace.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/internal/workplace?view=pending|all  (ellieo-erp, header x-internal-secret = INTERNAL_POINTS_SECRET)
 * → { pendingCount, requests: [{ ...request, method, workplaceKind, heldPosts, submission: { id, kind, status, files[] } | null }] }
 * Document files: GET /api/internal/verifications/{submission.id}/file?fileId= (INTERNAL_VERIFICATION_SECRET).
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const view = new URL(request.url).searchParams.get('view') === 'all' ? 'all' : 'pending'
    const all = await listStoredWorkplaceVerifications()
    const rows = view === 'all' ? all.slice(0, 200) : all.filter((item) => item.status === 'pending')
    const requests = []
    for (let i = 0; i < rows.length; i += 10) {
      requests.push(...(await Promise.all(rows.slice(i, i + 10).map(describeWorkplaceRequest))))
    }
    return NextResponse.json({
      view,
      pendingCount: all.filter((item) => item.status === 'pending').length,
      requests,
    })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
