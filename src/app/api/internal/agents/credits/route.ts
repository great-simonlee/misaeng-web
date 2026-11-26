import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { decideRefund, listPurchases, receiptPath, searchMembers } from '@lib/agents/credits.server'
import {
  addInHouse,
  excludeInHouse,
  getInHouseConfig,
  isInHouse,
  listInHouse,
  removeInHouse,
  saveInHouseConfig,
  topUpStaffCredits,
} from '@lib/agents/inHouse.server'
import { adjustCredits, creditBalance, creditLedger, creditLiability, CreditsError } from '@lib/agents/listingPlans.server'
import { listPromotions, savePromotion, setPromotionActive } from '@lib/agents/promotions.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Misaeng credits (licensed agents). Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET ?q=<email | name | nickname | uid>          → { members: [{ uid, name, nickname, email }] }
 *   GET ?uid=                                        → { uid, inHouse, balance, ledger, purchases }
 *   GET ?view=refunds                                → { purchases } (refund requests)
 *   GET ?view=purchases                              → { purchases } (latest)
 *   GET ?view=liability                              → { liability }
 *   GET ?view=in_house                               → { members, config }
 *   GET ?view=promotions                             → { promotions }
 *   Credits come only from payment (owner 11-25): there are no grants. In-house members get monthly staff credits.
 *   POST { action: 'adjust', purchaseId, amount (< 0), note }  → { removed }   (ERP checks Super Admin)
 *   POST { action: 'refund', id, approve, note }               → { status }
 *   POST { action: 'in_house_config', config }                 → { config }   (domains, exceptions, monthlyCredits, boostSlots)
 *   POST { action: 'in_house_add', uid, email }                → { members }
 *   POST { action: 'in_house_remove', uid, note }              → { staffCreditsRemoved, listingsDeleted }  (left: listings deleted)
 *   POST { action: 'in_house_exclude', uid, note }             → { staffCreditsRemoved }  (test account: listings kept)
 *   POST { action: 'staff_topup', uid, amount, note }          → { balance }   (ERP checks Super Admin)
 *   POST { action: 'promotion_save', promotion }               → { promotions }
 *   POST { action: 'promotion_active', id, active }            → { promotions }
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

function failure(error: unknown) {
  if (error instanceof CreditsError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  console.error('Misaeng credits (ERP) error:', error)
  return NextResponse.json({ error: 'Credits request failed.' }, { status: 500 })
}

function purchaseOut(row: Awaited<ReturnType<typeof listPurchases>>[number]) {
  return {
    id: row.id,
    uid: row.user_id,
    provider: row.provider ?? 'stripe',
    packId: row.pack_id,
    credits: row.credits,
    bonusCredits: row.bonus_credits ?? 0,
    discountCents: row.discount_cents ?? 0,
    amountCents: row.amount_cents,
    taxCents: row.tax_cents,
    status: row.status,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    brokerage: row.brokerage,
    card: row.provider === 'apple' ? `App Store${row.apple_environment && row.apple_environment !== 'Production' ? ` (${row.apple_environment})` : ''}` : row.card_last4 ? `${row.card_brand ?? 'card'} ·${row.card_last4}` : null,
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
    if (view === 'in_house') return NextResponse.json({ members: await listInHouse(), config: await getInHouseConfig() })
    if (view === 'promotions') return NextResponse.json({ promotions: await listPromotions() })
    const q = params.get('q')?.trim()
    if (q) return NextResponse.json({ members: await searchMembers(q) })
    const uid = params.get('uid')?.trim()
    if (!uid) return NextResponse.json({ error: 'Search by email, name or uid.' }, { status: 400 })
    const [inHouse, balance, ledger, purchases] = await Promise.all([
      isInHouse(uid).catch(() => false),
      creditBalance(uid),
      creditLedger(uid, 200),
      listPurchases({ uid }, 50),
    ])
    return NextResponse.json({ uid, inHouse, balance, ledger, purchases: purchases.map(purchaseOut) }, { headers: { 'Cache-Control': 'no-store' } })
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
    const uid = String(body.uid ?? '').trim()
    const note = String(body.note ?? '')
    if (action === 'grant') {
      return NextResponse.json(
        { error: 'Credits come only from payment. In-house members get monthly staff credits instead.', code: 'GRANTS_REMOVED' },
        { status: 410 },
      )
    }
    if (action === 'adjust') {
      return NextResponse.json(await adjustCredits({ purchaseId: String(body.purchaseId ?? ''), amount: Number(body.amount), note, by }))
    }
    if (action === 'in_house_config') return NextResponse.json({ config: await saveInHouseConfig(body.config, by) })
    if (action === 'in_house_add') {
      if (!uid) return NextResponse.json({ error: 'Choose a member.' }, { status: 400 })
      await addInHouse({ uid, email: String(body.email ?? ''), by })
      return NextResponse.json({ members: await listInHouse() })
    }
    if (action === 'in_house_remove') return NextResponse.json(await removeInHouse({ uid, note, by }))
    if (action === 'in_house_exclude') return NextResponse.json(await excludeInHouse({ uid, note, by }))
    if (action === 'staff_topup') {
      await topUpStaffCredits({ uid, amount: Number(body.amount), note, by })
      return NextResponse.json({ balance: await creditBalance(uid) })
    }
    if (action === 'promotion_save') {
      return NextResponse.json({ promotions: await savePromotion((body.promotion ?? {}) as Record<string, unknown>, by) })
    }
    if (action === 'promotion_active') {
      return NextResponse.json({ promotions: await setPromotionActive(String(body.id ?? ''), body.active === true) })
    }
    if (action === 'refund') {
      return NextResponse.json(await decideRefund({ purchaseId: String(body.id ?? ''), approve: body.approve === true, note: String(body.note ?? ''), by }))
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    return failure(error)
  }
}
