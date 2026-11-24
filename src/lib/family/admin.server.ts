import { getPremiumState, isActiveEntitlement } from '@lib/premium/access.server'
import { listEntitlements, listPaidByPayer, type PremiumEntitlement } from '@lib/premium/entitlements.server'

import { recipientOf } from './mail.server'
import {
  activeLink,
  enc,
  familyRest,
  FamilyError,
  isRequestOpen,
  linksOf,
  maskEmail,
  nicknameOf,
  REQUEST_SELECT,
  type LinkRow,
  type RequestRow,
} from './store.server'

/**
 * ERP views (English, internal API). Apple parent-paid subscriptions whose link ended and that still renew need the
 * parent to cancel in iPhone Settings — `needs_manual_cancel`.
 */

async function manualCancelIds(rows: PremiumEntitlement[]) {
  const out = new Set<string>()
  for (const row of rows) {
    if (row.source !== 'apple' || !row.payer_uid || row.cancel_at_period_end || !isActiveEntitlement(row)) continue
    const link = await activeLink(row.payer_uid, row.user_uid).catch(() => 'unknown' as const)
    if (!link) out.add(row.id)
  }
  return out
}

/** Nicknames / payer emails / manual-cancel flags for a page of Premium rows (internal Premium members list). */
export async function familyAdminInfo(rows: PremiumEntitlement[]) {
  const paid = rows.filter((r) => r.payer_uid)
  const uids = [...new Set(paid.flatMap((r) => [r.payer_uid!, r.user_uid]))]
  const nicknames = new Map<string, string | null>()
  const emails = new Map<string, string | null>()
  await Promise.all(
    uids.map(async (uid) => {
      nicknames.set(uid, await nicknameOf(uid))
    }),
  )
  await Promise.all(
    [...new Set(paid.map((r) => r.payer_uid!))].map(async (uid) => {
      emails.set(uid, (await recipientOf(uid)).email)
    }),
  )
  return { nicknames, emails, manualCancel: await manualCancelIds(paid) }
}

function linkView(link: LinkRow, uid: string, nickname: string | null) {
  return {
    uid,
    nickname,
    source: link.source,
    status: link.status,
    linkedAt: link.created_at,
    endedAt: link.ended_at,
    endedBy: link.ended_by,
  }
}

/** GET /api/internal/family/{uid}: links both ways (incl. ended), requests, parent-paid entitlements, parent pass. */
export async function getFamilyForAdmin(uid: string) {
  let asParent: LinkRow[]
  let asChild: LinkRow[]
  try {
    ;[asParent, asChild] = await Promise.all([linksOf({ parentUid: uid }), linksOf({ childUid: uid })])
  } catch (error) {
    if (error instanceof FamilyError && error.code === 'SETUP_REQUIRED') {
      return { setupRequired: true, parents: [], children: [], requests: [], entitlements: [], parentPremium: { until: null } }
    }
    throw error
  }
  const requests = await familyRest<RequestRow[]>(
    `parent_link_requests?or=(parent_uid.eq.${enc(uid)},child_uid.eq.${enc(uid)})&select=${REQUEST_SELECT}&order=created_at.desc&limit=50`,
  )
  const [ownRows, paidRows, state] = await Promise.all([
    listEntitlements(uid).catch(() => [] as PremiumEntitlement[]),
    listPaidByPayer(uid).catch(() => [] as PremiumEntitlement[]),
    getPremiumState({ uid, email: null }).catch(() => null),
  ])
  const entRows = [...paidRows, ...ownRows.filter((r) => r.payer_uid)]
  const manual = await manualCancelIds(entRows)
  return {
    parents: await Promise.all(asChild.map(async (l) => linkView(l, l.parent_uid, await nicknameOf(l.parent_uid)))),
    children: await Promise.all(asParent.map(async (l) => linkView(l, l.child_uid, await nicknameOf(l.child_uid)))),
    requests: await Promise.all(
      requests.map(async (r) => ({
        id: r.id,
        direction: r.parent_uid === uid ? 'outgoing' : 'incoming',
        emailMasked: maskEmail(r.email),
        parentUid: r.parent_uid,
        parentNickname: await nicknameOf(r.parent_uid),
        childUid: r.child_uid,
        status: isRequestOpen(r) ? 'pending' : r.status === 'pending' ? 'expired' : r.status,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        decidedAt: r.decided_at,
      })),
    ),
    entitlements: await Promise.all(
      entRows.map(async (r) => ({
        id: r.id,
        user_uid: r.user_uid,
        payer_uid: r.payer_uid ?? null,
        payer_nickname: await nicknameOf(r.payer_uid),
        child_nickname: await nicknameOf(r.user_uid),
        source: r.source,
        plan: r.plan,
        status: r.status,
        current_period_end: r.current_period_end,
        cancel_at_period_end: r.cancel_at_period_end,
        external_id: r.external_id,
        created_at: r.created_at,
        needs_manual_cancel: manual.has(r.id),
      })),
    ),
    parentPremium: { until: state?.parentPass?.until ?? null },
  }
}
