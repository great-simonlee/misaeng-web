import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { decideRefund, listPurchases, receiptPath, searchMembers } from '@lib/ellieo/credits.server'
import {
  adjustCredits,
  creditBalance,
  creditLedger,
  creditLiability,
  CreditsError,
  grantCredits,
} from '@lib/ellieo/listingPlans.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Ellieo credits. Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET ?q=<email | name | Ellieo ID | uid>          → { members: [{ uid, name, nickname, email }] }
 *   GET ?uid=                                        → { uid, balance, ledger, purchases }
 *   GET ?view=refunds                                → { purchases } (refund requests)
 *   GET ?view=purchases                              → { purchases } (latest)
 *   GET ?view=liability                              → { liability }
 *   POST { action: 'grant', uids[], amount, bucket, note }   → { results }   (note required)
 *   POST { action: 'adjust', uid, amount (< 0), bucket, note } → { removed, balance }  (ERP checks Super Admin)
 *   POST { action: 'refund', id, approve, note }             → { status }
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

function purchaseOut(row: Awaited<ReturnType<typeof listPurchases>>[number]) {
  return {
    id: row.id,
    uid: row.user_id,
    packId: row.pack_id,
    credits: row.credits,
    amountCents: row.amount_cents,
    taxCents: row.tax_cents,
    status: row.status,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    brokerage: row.brokerage,
    card: row.card_last4 ? `${row.card_brand ?? 'card'} ·${row.card_last4}` : null,
    refundReason: row.refund_reason,
    refundRequestedAt: row.refund_requested_at,
    refundDecidedBy: row.refund_decided_by,
    refundNote: row.refund_note,
    createdAt: row.created_at,
    receipt: receiptPath(row.id),
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams
    const view = params.get('view')
    if (view === 'refunds') return NextResponse.json({ purchases: (await listPurchases({ status: 'refund_requested' })).map(purchaseOut) })
    if (view === 'purchases') return NextResponse.json({ purchases: (await listPurchases({}, 100)).map(purchaseOut) })
    if (view === 'liability') return NextResponse.json({ liability: await creditLiability() })
    const q = params.get('q')?.trim()
    if (q) return NextResponse.json({ members: await searchMembers(q) })
    const uid = params.get('uid')?.trim()
    if (!uid) return NextResponse.json({ error: 'Search by email, name or uid.' }, { status: 400 })
    const [balance, ledger, purchases] = await Promise.all([creditBalance(uid), creditLedger(uid, 200), listPurchases({ uid }, 50)])
    return NextResponse.json({ uid, balance, ledger, purchases: purchases.map(purchaseOut) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const by = request.headers.get('x-admin-id')?.trim() || 'erp'
    const action = String(body.action ?? '')
    if (action === 'grant') {
      const uids = Array.isArray(body.uids) ? body.uids.map(String) : [String(body.uid ?? '')]
      const results = await grantCredits({ uids, amount: Number(body.amount), bucket: String(body.bucket ?? 'paid'), note: String(body.note ?? ''), by })
      return NextResponse.json({ results })
    }
    if (action === 'adjust') {
      return NextResponse.json(
        await adjustCredits({ uid: String(body.uid ?? ''), amount: Number(body.amount), bucket: String(body.bucket ?? 'paid'), note: String(body.note ?? ''), by }),
      )
    }
    if (action === 'refund') {
      return NextResponse.json(await decideRefund({ purchaseId: String(body.id ?? ''), approve: body.approve === true, note: String(body.note ?? ''), by }))
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    return failure(error)
  }
}
