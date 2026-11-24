import { isActiveEntitlement } from '@lib/premium/access.server'
import { payerColumnReady, rest as premiumRest, type PremiumEntitlement } from '@lib/premium/entitlements.server'
import { getStripe } from '@lib/premium/stripe.server'
import { notifyUsers } from '@lib/push/notify.server'
import { pointsRest } from '@lib/points/rest.server'
import { listPublicPostings } from '@lib/supabase/jobPostings.server'

import { stopParentRenewals } from './billing.server'
import { digestOptedOut, notifyAppleManualCancel } from './family.server'
import { formatDate, recipientOf, sendDigestMail, sendRenewalMail } from './mail.server'
import { activeLink, claimNotice, DAY_MS, enc, familyRest, nicknameOf, REQUEST_TTL_DAYS } from './store.server'

/**
 * POST /api/internal/family/daily — the server crontab calls it every hour; it decides what is due. Idempotent per day
 * (family_notices markers), so a retry or a second call sends nothing twice.
 *   1. expire email requests older than 14 days (and clear the stored email);
 *   2. parent-paid subscriptions whose link has ended: stop auto-renew again (Stripe / Google) or tell the parent once
 *      to cancel the App Store subscription;
 *   3. reminders to the PAYER (decision 8): annual + 3-month 7 days, monthly 3 days before renewal, trial 2 days
 *      before the first charge — Stripe, App Store and Play alike (Stripe's own webhook reminders skip parent-paid subs);
 *   4. parent digests (decision 7): 14 Korea mornings after a parent-paid subscription starts, from 09:00 KST, with
 *      platform-wide counts only (new job postings + visa news of the last 24 hours) — never the child's activity.
 */

const HOUR = 3_600_000
const KST = 9 * HOUR
const DIGEST_DAYS = 14
// Web (Stripe) list prices; App Store / Google Play charge the store prices (owner 11-24: web is up to 14% cheaper)
const PRICE: Record<string, string> = { monthly: '$29.99', season: '$59.99', annual: '$179.99' }
const STORE_PRICE: Record<string, string> = { monthly: '$34.99', season: '$69.99', annual: '$209.99' }

const kstDate = (ms: number) => new Date(ms + KST).toISOString().slice(0, 10)
const kstDay = (ms: number) => Math.floor((ms + KST) / DAY_MS)

async function parentPaidRows(): Promise<PremiumEntitlement[]> {
  if (!payerColumnReady()) return []
  const res = await premiumRest(
    'premium_entitlements?select=id,user_uid,payer_uid,email,source,plan,status,current_period_end,cancel_at_period_end,external_id,customer_id,product_id,environment,created_at,updated_at&payer_uid=not.is.null&order=created_at.desc&limit=2000',
  )
  if (!res.ok) throw new Error(`Reading parent-paid rows failed (HTTP ${res.status}).`)
  return (await res.json()) as PremiumEntitlement[]
}

async function expireRequests(now: number) {
  const iso = new Date(now).toISOString()
  const expired = await familyRest<{ id: string }[]>(`parent_link_requests?status=eq.pending&expires_at=lte.${enc(iso)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ status: 'expired', email: null, email_norm: null }),
  })
  // Anything not accepted keeps its email at most 14 days (declined / canceled already cleared; this is the backstop)
  await familyRest(
    `parent_link_requests?status=neq.accepted&created_at=lte.${enc(new Date(now - REQUEST_TTL_DAYS * DAY_MS).toISOString())}&email=not.is.null`,
    { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ email: null, email_norm: null }) },
  )
  return expired.length
}

async function enforceEndedLinks(rows: PremiumEntitlement[]) {
  let stopped = 0
  let appleNotices = 0
  const live = rows.filter((r) => isActiveEntitlement(r) && !r.cancel_at_period_end && r.payer_uid)
  const pairs = new Map<string, PremiumEntitlement[]>()
  for (const row of live) pairs.set(`${row.payer_uid}|${row.user_uid}`, [...(pairs.get(`${row.payer_uid}|${row.user_uid}`) ?? []), row])
  for (const [pair, list] of pairs) {
    const [parentUid, childUid] = pair.split('|')
    if (await activeLink(parentUid, childUid)) continue
    if (list.some((r) => r.source === 'stripe' || r.source === 'google')) {
      const result = await stopParentRenewals(parentUid, childUid)
      if (result.stopped) stopped += 1
    }
    // once per row: the unlink itself usually notified already (family_notices apple_manual:{id})
    const apple = list.filter((r) => r.source === 'apple')
    if (apple.length && (await notifyAppleManualCancel(parentUid, await nicknameOf(childUid), apple)) > 0) appleNotices += 1
  }
  return { stopped, appleNotices }
}

async function stripeAmount(row: PremiumEntitlement) {
  const stripe = getStripe()
  if (!stripe || row.source !== 'stripe') return null
  const upcoming = await stripe.invoices.retrieveUpcoming({ subscription: row.external_id }).catch(() => null)
  if (!upcoming) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (upcoming.currency || 'usd').toUpperCase() }).format(upcoming.amount_due / 100)
}

async function sendReminders(rows: PremiumEntitlement[], now: number) {
  let sent = 0
  for (const row of rows) {
    if (!row.payer_uid || row.cancel_at_period_end || !row.current_period_end) continue
    if (row.status !== 'active' && row.status !== 'trialing') continue
    if (row.source !== 'stripe' && row.source !== 'apple' && row.source !== 'google') continue
    const end = Date.parse(row.current_period_end)
    const kind = row.status === 'trialing' ? 'trial' : 'renewal'
    const leadDays = kind === 'trial' ? 2 : row.plan === 'monthly' ? 3 : 7
    if (!(end > now && end - now <= leadDays * DAY_MS)) continue
    if (!(await claimNotice(`${kind}:${row.id}:${row.current_period_end.slice(0, 10)}`, row.payer_uid))) continue
    const childNickname = await nicknameOf(row.user_uid)
    const price = row.source === 'stripe' ? ((await stripeAmount(row)) ?? PRICE[row.plan] ?? '') : (STORE_PRICE[row.plan] ?? '')
    await sendRenewalMail({
      parentUid: row.payer_uid,
      childNickname,
      kind,
      channel: row.source,
      plan: row.plan,
      price,
      date: row.current_period_end,
    })
    const { locale } = await recipientOf(row.payer_uid)
    const date = formatDate(locale, row.current_period_end)
    notifyUsers({
      type: 'account',
      userIds: [row.payer_uid],
      build: (t) => ({
        title: t(`api.push.family.${kind}.title`),
        body: t(`api.push.family.${kind}.body`, { name: childNickname || t('api.familyMail.child'), date, price }),
        data: { type: 'family_renewal', childUid: row.user_uid },
        threadId: 'family',
      }),
    })
    sent += 1
  }
  return sent
}

async function platformCounts(now: number) {
  const since = now - DAY_MS
  const [postings, news] = await Promise.all([
    listPublicPostings()
      .then((list) => list.filter((p) => p.postedAt >= since).length)
      .catch(() => 0),
    pointsRest<{ id: string }[]>(`visa_news?status=eq.published&published_at=gte.${enc(new Date(since).toISOString())}&select=id`)
      .then((list) => list.length)
      .catch(() => 0),
  ])
  return { postings, visaNews: news }
}

async function sendDigests(rows: PremiumEntitlement[], now: number) {
  const hourKst = new Date(now + KST).getUTCHours()
  // ~09:00 KST: due from 9 until noon (a missed hourly run catches up; never in the evening / at night)
  if (hourKst < 9 || hourKst >= 12) return { sent: 0, skipped: 'outside_window' as const }
  const today = kstDay(now)
  // Latest qualifying start per parent: day 1 = the morning after the payment, day 14 = the last notice.
  const byParent = new Map<string, { day: number; rows: PremiumEntitlement[] }>()
  for (const row of rows) {
    if (!row.payer_uid) continue
    if (row.status === 'canceled' && row.source !== 'stripe') continue // App Store / Play refund or revoke
    const day = today - kstDay(Date.parse(row.created_at))
    if (day < 1 || day > DIGEST_DAYS) continue
    const entry = byParent.get(row.payer_uid)
    if (!entry || day < entry.day) byParent.set(row.payer_uid, { day, rows: [...(entry?.rows ?? []), row] })
    else entry.rows.push(row)
  }
  if (!byParent.size) return { sent: 0 }
  // Record each subscription's digest window (ERP / support visibility)
  await familyRest('parent_digest?on_conflict=entitlement_id', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify(
      [...byParent.values()].flatMap((e) =>
        e.rows.map((r) => ({ entitlement_id: r.id, parent_uid: r.payer_uid, child_uid: r.user_uid, started_at: r.created_at })),
      ),
    ),
  }).catch((error) => console.error('[family digest] parent_digest upsert', error))

  const counts = await platformCounts(now)
  let sent = 0
  for (const [parentUid, { day, rows: list }] of byParent) {
    if (await digestOptedOut(parentUid).catch(() => false)) continue
    if (!(await claimNotice(`digest:${parentUid}:${kstDate(now)}`, parentUid))) continue
    const last = day >= DIGEST_DAYS
    notifyUsers({
      type: 'account',
      userIds: [parentUid],
      build: (t) => ({
        title: t(last ? 'api.push.family.digest.lastTitle' : 'api.push.family.digest.title'),
        body: t(last ? 'api.push.family.digest.lastBody' : 'api.push.family.digest.body', counts),
        data: { type: 'parent_digest' },
        threadId: 'parent-digest',
      }),
    })
    await sendDigestMail({ parentUid, day, ...counts })
    await familyRest('parent_digest_settings?on_conflict=parent_uid', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ parent_uid: parentUid, last_sent_on: kstDate(now), updated_at: new Date(now).toISOString() }),
    }).catch(() => null)
    for (const row of list) {
      await familyRest(`parent_digest?entitlement_id=eq.${enc(row.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ days_sent: Math.min(DIGEST_DAYS, day), last_sent_on: kstDate(now) }),
      }).catch(() => null)
    }
    sent += 1
  }
  return { sent, ...counts }
}

export async function runFamilyDaily(now = Date.now()) {
  const expiredRequests = await expireRequests(now)
  const rows = await parentPaidRows()
  const ended = await enforceEndedLinks(rows)
  const reminders = await sendReminders(rows, now)
  const digests = await sendDigests(rows, now)
  return { expiredRequests, endedLinks: ended, reminders, digests, at: new Date(now).toISOString() }
}
