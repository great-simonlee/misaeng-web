import { isParentAccount } from '@lib/community/schoolGate'
import { invalidatePremium, isActiveEntitlement, PAID_SOURCES, sameStripeMode } from '@lib/premium/access.server'
import {
  listEntitlements,
  listPaidByPayer,
  type PremiumEntitlement,
} from '@lib/premium/entitlements.server'
import { cancelGoogleRenewal } from '@lib/premium/google.server'
import { getStripe, syncSubscription } from '@lib/premium/stripe.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { activeLink, FamilyError } from './store.server'

/**
 * Parent-paid Premium rules (owner decisions 3–5, 9):
 * - a parent buys only for a linked child; never two paid subscriptions on one child (the child's own Stripe / App Store
 *   / Play subscription, or another parent's, blocks it — launch gift and codes don't);
 * - in-app: one subscription per Apple ID / Play account, so a parent holds at most ONE in-app parent subscription;
 * - unlink / account deletion: the child keeps the paid period, auto-renew stops (Stripe + Google by the server,
 *   Apple only by the parent in iPhone Settings).
 */

export type BuyBlockedReason = 'OWN_SUBSCRIPTION' | 'OTHER_PARENT' | 'ALREADY_PAID_BY_YOU'

const livePaid = (row: PremiumEntitlement) => PAID_SOURCES.has(row.source) && sameStripeMode(row) && isActiveEntitlement(row)

export function blockedReason(parentUid: string, childRows: PremiumEntitlement[]): BuyBlockedReason | null {
  const paid = childRows.filter(livePaid)
  if (paid.some((r) => r.payer_uid === parentUid)) return 'ALREADY_PAID_BY_YOU'
  if (paid.some((r) => r.payer_uid && r.payer_uid !== parentUid)) return 'OTHER_PARENT'
  if (paid.some((r) => !r.payer_uid)) return 'OWN_SUBSCRIPTION'
  return null
}

/** The parent already has an in-app subscription (their own, or one they pay for `exceptChild`'s sibling). */
export function hasOtherInApp(parentOwnRows: PremiumEntitlement[], parentPaidRows: PremiumEntitlement[], exceptChild?: string) {
  const inApp = (r: PremiumEntitlement) => (r.source === 'apple' || r.source === 'google') && isActiveEntitlement(r)
  return parentOwnRows.some((r) => inApp(r) && !r.payer_uid) || parentPaidRows.some((r) => inApp(r) && r.user_uid !== exceptChild)
}

export const BLOCK_STATUS: Record<string, number> = {
  NOT_PARENT: 403,
  NOT_LINKED: 403,
  OWN_SUBSCRIPTION: 409,
  OTHER_PARENT: 409,
  ALREADY_PAID_BY_YOU: 409,
  IN_APP_LIMIT: 409,
}

/**
 * Checks a parent purchase for a child. Throws FamilyError (code NOT_PARENT / NOT_LINKED / OWN_SUBSCRIPTION /
 * OTHER_PARENT / ALREADY_PAID_BY_YOU, and IN_APP_LIMIT when `inApp`). → the child's rows (trial: none ever).
 */
export async function assertParentCanBuy(parentUid: string, childUid: string, options: { inApp?: boolean } = {}) {
  const profile = await getSupabaseProfile(parentUid)
  if (!isParentAccount(profile)) throw new FamilyError('NOT_PARENT', 'family.notParent', 403)
  if (!(await activeLink(parentUid, childUid))) throw new FamilyError('NOT_LINKED', 'family.notLinked', 403)
  const child = await getSupabaseProfile(childUid).catch(() => null)
  if (!child || child.status === 'deleted') throw new FamilyError('NOT_LINKED', 'family.notLinked', 403)
  const childRows = await listEntitlements(childUid)
  const reason = blockedReason(parentUid, childRows)
  if (reason) throw new FamilyError(reason, `family.blocked.${reason}`, 409)
  if (options.inApp) {
    const [own, paid] = await Promise.all([listEntitlements(parentUid), listPaidByPayer(parentUid)])
    if (hasOtherInApp(own, paid, childUid)) throw new FamilyError('IN_APP_LIMIT', 'family.blocked.IN_APP_LIMIT', 409)
  }
  return { childRows, childProfile: child }
}

export type RenewalStopped = 'stripe' | 'google' | 'apple_manual' | null

/** Rows `parentUid` pays for on `childUid` that still renew. */
export async function renewingPaidRows(parentUid: string, childUid: string) {
  const rows = await listEntitlements(childUid)
  return rows.filter((r) => r.payer_uid === parentUid && livePaid(r) && !r.cancel_at_period_end)
}

/**
 * Stops auto-renew of everything `parentUid` pays for on `childUid` (the paid period stays). Stripe / Google failures
 * are logged; the daily job retries rows whose link has ended. → which channel was stopped ('apple_manual' = the
 * parent must cancel in iPhone Settings; the caller tells them).
 */
export async function stopParentRenewals(parentUid: string, childUid: string): Promise<{ stopped: RenewalStopped; apple: PremiumEntitlement[] }> {
  const rows = await renewingPaidRows(parentUid, childUid).catch((error) => {
    console.error('[family] reading paid rows failed', error)
    return [] as PremiumEntitlement[]
  })
  const done = new Set<RenewalStopped>()
  const apple: PremiumEntitlement[] = []
  for (const row of rows) {
    try {
      if (row.source === 'stripe') {
        const stripe = getStripe()
        if (!stripe) continue
        const sub = await stripe.subscriptions.update(row.external_id, { cancel_at_period_end: true })
        await syncSubscription(sub)
        done.add('stripe')
      } else if (row.source === 'google') {
        await cancelGoogleRenewal(row.external_id.replace(/^google:/, ''))
        done.add('google')
      } else if (row.source === 'apple') {
        apple.push(row)
        done.add('apple_manual')
      }
    } catch (error) {
      console.error('[family] stopping renewal failed', row.source, row.external_id, error)
    }
  }
  invalidatePremium(childUid)
  invalidatePremium(parentUid)
  const stopped: RenewalStopped = done.has('apple_manual') ? 'apple_manual' : done.has('google') ? 'google' : done.has('stripe') ? 'stripe' : null
  return { stopped, apple }
}
