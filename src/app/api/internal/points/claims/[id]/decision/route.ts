import { NextResponse } from 'next/server'

import { decideClaim, type ClaimDecision } from '@lib/points/claims.server'
import { CLAIM_COMPONENTS, type ClaimComponent } from '@lib/points/defaults'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * ERP claim review (server to server, header `x-internal-secret`, optional `x-admin-id`).
 * { action: 'approve', components?: ('base'|'detail'|'verified'|'pick'|'first_company')[] }  default = all requested
 * { action: 'reject', reason: string }                                                        pending only
 * { action: 'pick' }                                                                          approves if needed + pays pick
 * → { claim, paid: { component: amount } }. Approval / pick sends a points push.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const { id } = await context.params
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const actor = internalActor(request, body)
    let decision: ClaimDecision
    if (body.action === 'approve') {
      const components = Array.isArray(body.components)
        ? body.components.filter((c): c is ClaimComponent => CLAIM_COMPONENTS.includes(c as ClaimComponent))
        : undefined
      decision = { action: 'approve', components }
    } else if (body.action === 'reject') {
      decision = { action: 'reject', reason: String(body.reason || '').slice(0, 500) }
    } else if (body.action === 'pick') {
      decision = { action: 'pick' }
    } else {
      return NextResponse.json({ error: "action must be 'approve', 'reject' or 'pick'." }, { status: 400 })
    }
    return NextResponse.json(await decideClaim(id, decision, actor))
  } catch (error) {
    return internalErrorResponse(error)
  }
}
