import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { adminFindUserByEmail } from '@lib/auth/supabaseAuth.server'
import { creditBalance, creditLedger, CreditsError, grantCredits } from '@lib/ellieo/listingPlans.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Ellieo credits (no real payments yet: staff load credits by hand).
 * Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET  ?uid= or ?email=                                  → { uid, email, balance, ledger }
 *   POST { uid, amount, bucket: paid|reward, note }        → { balance }
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

function failure(error: unknown) {
  if (error instanceof CreditsError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  console.error('Ellieo credits (ERP) error:', error)
  return NextResponse.json({ error: 'Credits request failed.' }, { status: 500 })
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams
    let uid = params.get('uid')?.trim() || ''
    let email: string | null = null
    if (!uid && params.get('email')) {
      const user = await adminFindUserByEmail(params.get('email')!.trim().toLowerCase())
      if (!user) return NextResponse.json({ error: 'No Ellieo member with that email.' }, { status: 404 })
      uid = user.id
      email = user.email ?? null
    }
    if (!uid) return NextResponse.json({ error: 'uid or email is required.' }, { status: 400 })
    const [balance, ledger] = await Promise.all([creditBalance(uid), creditLedger(uid, 200)])
    return NextResponse.json({ uid, email, balance, ledger }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const uid = String(body.uid ?? '').trim()
    if (!uid) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
    const balance = await grantCredits({
      uid,
      amount: Number(body.amount),
      bucket: String(body.bucket ?? 'paid'),
      note: typeof body.note === 'string' ? body.note : null,
      by: request.headers.get('x-admin-id')?.trim() || 'erp',
    })
    return NextResponse.json({ balance })
  } catch (error) {
    return failure(error)
  }
}
