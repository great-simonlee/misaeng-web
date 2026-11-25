import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import {
  AgentLicenseError,
  decideAgentLicense,
  licensePhotoUrl,
  listForReview,
  type ReviewFilter,
} from '@lib/ellieo/agentLicense.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Ellieo: the Licensed Agents review queue (ellieo-erp Ellieo → Licensed Agents).
 * Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = the reviewer's email.
 *
 *   GET  ?status=pending|approved|rejected|expired|all → { applications, counts, setupRequired }
 *   POST { action: 'photo', id }                                → { url, expiresIn, mimeType } (60 s signed link)
 *   POST { action: 'approve', id, expiresOn }                   → { application } (member pushed)
 *   POST { action: 'reject', id, rejectReason }                 → { application } (member pushed)
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

const FILTERS: ReviewFilter[] = ['pending', 'approved', 'rejected', 'expired', 'all']

function failure(error: unknown) {
  if (error instanceof AgentLicenseError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error('Ellieo agent license review error:', error)
  return NextResponse.json({ error: 'Agent license request failed.' }, { status: 500 })
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const raw = new URL(request.url).searchParams.get('status') as ReviewFilter | null
    const filter = raw && FILTERS.includes(raw) ? raw : 'pending'
    return NextResponse.json(await listForReview(filter), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    if (action === 'photo') {
      return NextResponse.json(await licensePhotoUrl(id), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (action === 'approve' || action === 'reject') {
      const application = await decideAgentLicense({
        id,
        action,
        expiresOn: typeof body.expiresOn === 'string' ? body.expiresOn : null,
        rejectReason: typeof body.rejectReason === 'string' ? body.rejectReason : null,
        reviewer: request.headers.get('x-admin-id')?.trim() || 'erp',
      })
      return NextResponse.json({ application })
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    return failure(error)
  }
}
