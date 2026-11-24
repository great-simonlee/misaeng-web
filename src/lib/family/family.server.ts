import { randomBytes } from 'node:crypto'

import { isParentAccount } from '@lib/community/schoolGate'
import { parseLocale } from '@lib/i18n/locales'
import { getPointsConfig, ruleCap } from '@lib/points/config.server'
import { normalizeEmailForPoints } from '@lib/points/identity'
import { pointsRest, PointsStoreError } from '@lib/points/rest.server'
import { getPremiumState, isActiveEntitlement, PAID_SOURCES, sameStripeMode } from '@lib/premium/access.server'
import { listEntitlements, listPaidByPayer, type PremiumEntitlement } from '@lib/premium/entitlements.server'
import { notifyUsers } from '@lib/push/notify.server'
import { getSupabaseProfile, upsertSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

import { blockedReason, hasOtherInApp, stopParentRenewals, type BuyBlockedReason, type RenewalStopped } from './billing.server'
import { sendAppleCancelMail, sendLinkedMail, sendRequestMail, sendUnlinkedMail } from './mail.server'
import {
  activeLink,
  claimNotice,
  createLink,
  DAY_MS,
  enc,
  familyRest,
  FamilyError,
  isRequestOpen,
  LINK_SELECT,
  linksOf,
  memberEmails,
  nicknameOf,
  REQUEST_SELECT,
  REQUEST_TTL_DAYS,
  type LinkRow,
  type RequestRow,
} from './store.server'

/**
 * Parent ↔ child links (owner decisions 2026-11-24). Both ways:
 *   a. child → parent invite link (src/lib/parents/parentInvites.server.ts) — accepting makes a parent_links row;
 *   b. parent → child by email (this file): the CHILD must accept; email alone never links.
 * One parent → many children; one child → at most cap.parent_invites (2) parents (active links + open invite links).
 * Either side can unlink: the child keeps the paid period, auto-renew stops (billing.server.ts).
 * API: src/app/api/family/*. Contract: scratchpad family-contract.md.
 */

const PENDING_MAX = 5
const DAILY_MAX = 10

type AuthUser = { uid: string; email?: string | null }

async function parentCap() {
  const config = await getPointsConfig().catch(() => null)
  return (config ? ruleCap(config, 'cap.parent_invites') : null) ?? 2
}

/** Parents a child has now: active links + open (unexpired) invite links that are not linked yet. */
async function parentSlotsUsed(childUid: string) {
  const [links, invites] = await Promise.all([
    linksOf({ childUid, activeOnly: true }),
    pointsRest<{ code: string; parent_uid: string | null }[]>(
      `parent_invites?student_uid=eq.${enc(childUid)}&status=eq.open&expires_at=gt.${enc(new Date().toISOString())}&select=code,parent_uid`,
    ).catch(() => []),
  ])
  return links.length + invites.length
}

/** Same rule as acceptParentInvite: an account with a school / workplace verification, own parent invites, or parents of its own can't become a parent account. */
async function parentEligibility(uid: string, profile: SupabaseProfileRecord | null) {
  if (profile?.status === 'suspended') throw new FamilyError('ACCOUNT_SUSPENDED', 'common.accountSuspended', 403)
  if (isParentAccount(profile)) return
  const [ownInvites, myParents] = await Promise.all([
    pointsRest<{ status: string }[]>(`parent_invites?student_uid=eq.${enc(uid)}&select=status`).catch(() => []),
    linksOf({ childUid: uid, activeOnly: true }),
  ])
  if (
    profile?.schoolEmailVerified ||
    (profile?.workplaceStatus && profile.workplaceStatus !== 'none') ||
    ownInvites.some((r) => r.status !== 'revoked') ||
    myParents.length > 0
  ) {
    throw new FamilyError('PARENT_ACCOUNT_INELIGIBLE', 'parents.accountIneligible', 409)
  }
}

/**
 * Invite-link parents from before parent_links.sql: profile.invitedByUid without any link row for the pair (active or
 * ended) gets its active link once. The SQL backfill covers parent_invites; this covers the profile.
 */
async function ensureProfileLink(uid: string, profile: SupabaseProfileRecord | null) {
  const child = profile?.invitedByUid
  if (!isParentAccount(profile) || !child || child === uid) return
  const rows = await familyRest<LinkRow[]>(
    `parent_links?parent_uid=eq.${enc(uid)}&child_uid=eq.${enc(child)}&select=${LINK_SELECT}&limit=1`,
  )
  if (rows.length) return
  const student = await getSupabaseProfile(child).catch(() => null)
  if (!student || student.status === 'deleted') return
  await createLink({
    parentUid: uid,
    childUid: child,
    source: 'invite',
    inviteCode: profile?.parentInviteCode ?? null,
    createdAt: profile?.parentLinkedAt ? new Date(profile.parentLinkedAt).toISOString() : undefined,
  })
}

/* ───────────────────────── Overview (GET /api/family) ───────────────────────── */

export type ChildPremium = {
  premium: boolean
  plan: string | null
  source: string | null
  until: string | null
  status: string | null
  cancelAtPeriodEnd: boolean
  paidByMe: boolean
  paidByOtherParent: boolean
  ownPaid: boolean
  channel: 'stripe' | 'apple' | 'google' | null
}

const livePaid = (row: PremiumEntitlement) => PAID_SOURCES.has(row.source) && sameStripeMode(row) && isActiveEntitlement(row)

async function childPremium(parentUid: string, childUid: string, childRows: PremiumEntitlement[], childProfile: SupabaseProfileRecord | null): Promise<ChildPremium> {
  const paid = childRows.filter(livePaid)
  const mine = paid.find((r) => r.payer_uid === parentUid)
  const other = paid.find((r) => r.payer_uid && r.payer_uid !== parentUid)
  const own = paid.find((r) => !r.payer_uid)
  const shown = mine ?? other ?? own
  if (shown) {
    return {
      premium: true,
      plan: shown.plan,
      source: shown.source,
      until: shown.current_period_end,
      status: shown.status,
      cancelAtPeriodEnd: shown.cancel_at_period_end,
      paidByMe: Boolean(mine),
      paidByOtherParent: Boolean(other),
      ownPaid: Boolean(own),
      channel: shown.source as 'stripe' | 'apple' | 'google',
    }
  }
  // Codes / launch gift (don't block a parent purchase)
  const state = await getPremiumState({ uid: childUid, email: childProfile?.email ?? null }).catch(() => null)
  return {
    premium: Boolean(state?.premium),
    plan: state?.premium ? state.plan : null,
    source: state?.premium ? state.source : null,
    until: state?.premium ? state.until : null,
    status: state?.premium ? state.status : null,
    cancelAtPeriodEnd: Boolean(state?.premium && state.cancelAtPeriodEnd),
    paidByMe: false,
    paidByOtherParent: false,
    ownPaid: false,
    channel: null,
  }
}

function requestView(row: RequestRow) {
  return {
    id: row.id,
    email: row.email,
    status: isRequestOpen(row) ? 'pending' : row.status === 'pending' ? 'expired' : row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

/** Pending requests addressed to this member (child_uid, or one of their emails). */
async function incomingRequests(user: AuthUser, profile: SupabaseProfileRecord | null) {
  if (isParentAccount(profile)) return []
  const emails = memberEmails(profile, user.email)
  const or = [`child_uid.eq.${enc(user.uid)}`, ...(emails.length ? [`email_norm.in.(${emails.map((e) => `"${enc(e)}"`).join(',')})`] : [])]
  const rows = await familyRest<RequestRow[]>(
    `parent_link_requests?status=eq.pending&expires_at=gt.${enc(new Date().toISOString())}&or=(${or.join(',')})&select=${REQUEST_SELECT}&order=created_at.desc&limit=20`,
  )
  return rows.filter((r) => r.parent_uid !== user.uid)
}

export async function getFamilyOverview(user: AuthUser) {
  const profile = await getSupabaseProfile(user.uid)
  const isParent = isParentAccount(profile)
  if (isParent) await ensureProfileLink(user.uid, profile).catch((error) => console.error('[family] profile link', error))

  const [asParent, asChild, outgoingRows, incomingRows] = await Promise.all([
    isParent ? linksOf({ parentUid: user.uid, activeOnly: true }) : Promise.resolve([] as LinkRow[]),
    linksOf({ childUid: user.uid, activeOnly: true }),
    isParent
      ? familyRest<RequestRow[]>(
          `parent_link_requests?parent_uid=eq.${enc(user.uid)}&status=eq.pending&expires_at=gt.${enc(new Date().toISOString())}&select=${REQUEST_SELECT}&order=created_at.desc`,
        )
      : Promise.resolve([] as RequestRow[]),
    incomingRequests(user, profile),
  ])

  let children: unknown[] = []
  let parentPremium: { until: string | null } = { until: null }
  if (isParent) {
    const [ownRows, paidRows, state] = await Promise.all([
      listEntitlements(user.uid),
      listPaidByPayer(user.uid),
      getPremiumState({ uid: user.uid, email: user.email ?? null }),
    ])
    parentPremium = { until: state.parentPass?.until ?? null }
    children = await Promise.all(
      asParent.map(async (link) => {
        const childProfile = await getSupabaseProfile(link.child_uid).catch(() => null)
        const rows = await listEntitlements(link.child_uid)
        const reason: BuyBlockedReason | null = blockedReason(user.uid, rows)
        return {
          uid: link.child_uid,
          nickname: childProfile?.status === 'deleted' ? null : childProfile?.nickname?.trim() || null,
          avatarUrl: childProfile?.photoURL ?? null,
          linkedAt: link.created_at,
          source: link.source,
          premium: await childPremium(user.uid, link.child_uid, rows, childProfile),
          canBuy: reason === null,
          buyBlockedReason: reason,
          inAppAllowed: reason === null && !hasOtherInApp(ownRows, paidRows, link.child_uid),
        }
      }),
    )
  }

  // Which linked parent pays for my Premium now (apps show "부모님이 결제한 프리미엄")
  const payers = asChild.length
    ? new Set(
        (await listEntitlements(user.uid).catch(() => [] as PremiumEntitlement[]))
          .filter((r) => livePaid(r) && r.payer_uid)
          .map((r) => r.payer_uid as string),
      )
    : new Set<string>()
  const parents = await Promise.all(
    asChild.map(async (link) => ({
      uid: link.parent_uid,
      nickname: await nicknameOf(link.parent_uid),
      linkedAt: link.created_at,
      source: link.source,
      paying: payers.has(link.parent_uid),
    })),
  )
  const incoming = await Promise.all(
    incomingRows.map(async (row) => ({
      id: row.id,
      parentNickname: await nicknameOf(row.parent_uid),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    })),
  )
  const digest = isParent ? await digestOptedOut(user.uid).catch(() => false) : false
  return {
    role: isParent ? ('parent' as const) : ('member' as const),
    children,
    parents,
    outgoing: outgoingRows.map(requestView),
    incoming,
    parentPremium,
    /** Parent digest switch (app settings / web): PUT /api/family/digest {optedOut} */
    digest: { optedOut: digest },
  }
}

/* ───────────────────────── Email requests ───────────────────────── */

async function findMemberByEmail(norm: string, raw: string): Promise<string | null> {
  const identities = await pointsRest<{ user_id: string; kind: string }[]>(
    `point_identities?identifier_normalized=eq.${enc(norm)}&kind=in.(signup_email,school_email)&select=user_id,kind&limit=5`,
  ).catch(() => [])
  const school = identities.find((r) => r.kind === 'school_email')?.user_id
  if (school) return school
  const signup = identities.find((r) => r.kind === 'signup_email')?.user_id
  if (signup) return signup
  const accounts = await pointsRest<{ uid: string }[]>(
    `auth_accounts?email=ilike.${enc(raw.replace(/[%_\\]/g, '\\$&'))}&select=uid&limit=2`,
  ).catch(() => [])
  return accounts.length === 1 ? accounts[0].uid : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/family/requests {email}. The sender becomes a parent account (if eligible). The answer is the same whether
 * or not the email belongs to a member (no account enumeration); a member also gets a push + in-app request.
 */
export async function createFamilyRequest(user: AuthUser, input: { email: unknown; locale?: string | null }) {
  const raw = String(input.email ?? '').trim().slice(0, 254)
  const norm = normalizeEmailForPoints(raw)
  if (!norm || !EMAIL_RE.test(raw)) throw new FamilyError('INVALID_EMAIL', 'family.invalidEmail', 400)
  if (memberEmails(null, user.email).includes(norm)) throw new FamilyError('OWN_EMAIL', 'family.ownEmail', 400)

  const profile = await getSupabaseProfile(user.uid)
  if (memberEmails(profile, user.email).includes(norm)) throw new FamilyError('OWN_EMAIL', 'family.ownEmail', 400)
  await parentEligibility(user.uid, profile)

  const now = Date.now()
  const mine = await familyRest<RequestRow[]>(
    `parent_link_requests?parent_uid=eq.${enc(user.uid)}&created_at=gt.${enc(new Date(now - DAY_MS).toISOString())}&select=${REQUEST_SELECT}`,
  )
  const pending = await familyRest<RequestRow[]>(
    `parent_link_requests?parent_uid=eq.${enc(user.uid)}&status=eq.pending&expires_at=gt.${enc(new Date(now).toISOString())}&select=${REQUEST_SELECT}`,
  )
  const same = pending.find((r) => r.email_norm === norm)
  if (same) return { request: requestView(same), created: false }
  if (pending.length >= PENDING_MAX) throw new FamilyError('TOO_MANY_PENDING', 'family.tooManyPending', 429, { max: PENDING_MAX })
  if (mine.length >= DAILY_MAX) throw new FamilyError('DAILY_LIMIT', 'family.dailyLimit', 429, { max: DAILY_MAX })

  const childUid = await findMemberByEmail(norm, raw)
  if (childUid === user.uid) throw new FamilyError('OWN_EMAIL', 'family.ownEmail', 400)
  if (childUid && (await activeLink(user.uid, childUid))) throw new FamilyError('ALREADY_LINKED', 'family.alreadyLinked', 409)
  const child = childUid ? await getSupabaseProfile(childUid).catch(() => null) : null
  // A found account that can't be a child (parent account, deleted) is treated like a non-member: same answer.
  const target = child && child.status !== 'deleted' && !isParentAccount(child) ? childUid : null

  // Expired pending rows for this email would block the unique index: close them first.
  await familyRest(
    `parent_link_requests?parent_uid=eq.${enc(user.uid)}&email_norm=eq.${enc(norm)}&status=eq.pending`,
    { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ status: 'expired' }) },
  )
  if (!isParentAccount(profile)) {
    await upsertSupabaseProfile(user.uid, { accountType: 'parent' })
  }
  const token = randomBytes(24).toString('base64url')
  const inserted = await familyRest<RequestRow[]>('parent_link_requests', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      parent_uid: user.uid,
      email: raw,
      email_norm: norm,
      child_uid: target,
      token,
      status: 'pending',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + REQUEST_TTL_DAYS * DAY_MS).toISOString(),
    }),
  }).catch(async (error) => {
    // A double tap: the other call created the pending request for this email first
    if (error instanceof PointsStoreError && error.code === '23505') return null
    throw error
  })
  if (!inserted) {
    const [existing] = await familyRest<RequestRow[]>(
      `parent_link_requests?parent_uid=eq.${enc(user.uid)}&email_norm=eq.${enc(norm)}&status=eq.pending&select=${REQUEST_SELECT}&limit=1`,
    )
    if (existing) return { request: requestView(existing), created: false }
    throw new FamilyError('FAILED', 'family.failed', 500)
  }
  const row = inserted[0]

  const parentNickname = profile?.nickname?.trim() || null
  const locale = parseLocale(child?.preferredLocale) ?? parseLocale(input.locale) ?? parseLocale(profile?.preferredLocale) ?? 'ko'
  await sendRequestMail({ to: raw, locale, parentNickname, token, expiresAt: row.expires_at })
  if (target) {
    notifyUsers({
      type: 'account',
      userIds: [target],
      build: (t) => ({
        title: t('api.push.family.request.title'),
        body: t('api.push.family.request.body', { name: parentNickname || t('api.familyMail.someone') }),
        data: { type: 'family_request', requestId: row.id },
        threadId: 'family',
      }),
    })
  }
  return { request: requestView(row), created: true }
}

async function getRequest(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await familyRest<RequestRow[]>(`parent_link_requests?id=eq.${enc(id)}&select=${REQUEST_SELECT}&limit=1`)
  return rows[0] ?? null
}

const CLEARED = { email: null, email_norm: null }

export async function cancelFamilyRequest(user: AuthUser, id: string) {
  const row = await getRequest(id)
  if (!row || row.parent_uid !== user.uid) throw new FamilyError('NOT_FOUND', 'family.requestNotFound', 404)
  if (row.status !== 'pending') return { ok: true as const }
  await familyRest(`parent_link_requests?id=eq.${enc(row.id)}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'canceled', decided_at: new Date().toISOString(), ...CLEARED }),
  })
  return { ok: true as const }
}

async function requestForChild(user: AuthUser, id: string) {
  const row = await getRequest(id)
  if (!row) throw new FamilyError('NOT_FOUND', 'family.requestNotFound', 404)
  const profile = await getSupabaseProfile(user.uid)
  const matches = row.child_uid === user.uid || Boolean(row.email_norm && memberEmails(profile, user.email).includes(row.email_norm))
  if (!matches || row.parent_uid === user.uid) throw new FamilyError('EMAIL_MISMATCH', 'family.emailMismatch', 403)
  return { row, profile }
}

export async function acceptFamilyRequest(user: AuthUser, id: string) {
  const { row, profile } = await requestForChild(user, id)
  if (row.status === 'accepted' && row.child_uid === user.uid) return { ok: true as const, already: true }
  if (!isRequestOpen(row)) {
    throw new FamilyError(row.status === 'pending' || row.status === 'expired' ? 'EXPIRED' : 'NOT_PENDING', row.status === 'pending' || row.status === 'expired' ? 'family.requestExpired' : 'family.requestClosed', 410)
  }
  if (profile?.status === 'suspended') throw new FamilyError('ACCOUNT_SUSPENDED', 'common.accountSuspended', 403)
  if (isParentAccount(profile)) throw new FamilyError('CHILD_IS_PARENT', 'family.childIsParent', 409)
  const parent = await getSupabaseProfile(row.parent_uid).catch(() => null)
  if (!parent || parent.status === 'deleted' || parent.status === 'suspended' || !isParentAccount(parent)) {
    throw new FamilyError('NOT_PENDING', 'family.requestClosed', 410)
  }
  const existing = await activeLink(row.parent_uid, user.uid)
  if (!existing && (await parentSlotsUsed(user.uid)) >= (await parentCap())) {
    throw new FamilyError('PARENT_LIMIT', 'family.parentLimit', 409, { max: await parentCap() })
  }
  const updated = await familyRest<RequestRow[]>(`parent_link_requests?id=eq.${enc(row.id)}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ status: 'accepted', child_uid: user.uid, decided_at: new Date().toISOString(), ...CLEARED }),
  })
  if (!updated.length) throw new FamilyError('NOT_PENDING', 'family.requestClosed', 410)
  if (!existing) await createLink({ parentUid: row.parent_uid, childUid: user.uid, source: 'email', requestId: row.id })

  const childNickname = profile?.nickname?.trim() || null
  notifyUsers({
    type: 'account',
    userIds: [row.parent_uid],
    build: (t) => ({
      title: t('api.push.family.linked.title'),
      body: t('api.push.family.linked.body', { name: childNickname || t('api.familyMail.child') }),
      data: { type: 'family_linked', childUid: user.uid },
      threadId: 'family',
    }),
  })
  await sendLinkedMail(row.parent_uid, childNickname)
  return { ok: true as const, already: false, parentUid: row.parent_uid }
}

export async function declineFamilyRequest(user: AuthUser, id: string) {
  const { row } = await requestForChild(user, id)
  if (row.status !== 'pending') return { ok: true as const }
  await familyRest(`parent_link_requests?id=eq.${enc(row.id)}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'declined', child_uid: user.uid, decided_at: new Date().toISOString(), ...CLEARED }),
  })
  return { ok: true as const }
}

/** Mail landing page (no login): the parent's nickname and the request state only. */
export async function getRequestByToken(token: string) {
  const value = String(token || '').trim()
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(value)) return null
  const rows = await familyRest<RequestRow[]>(`parent_link_requests?token=eq.${enc(value)}&select=${REQUEST_SELECT}&limit=1`)
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    parentNickname: await nicknameOf(row.parent_uid),
    status: isRequestOpen(row) ? 'pending' : row.status === 'pending' ? 'expired' : row.status,
    expiresAt: row.expires_at,
  }
}

/* ───────────────────────── Unlink ───────────────────────── */

async function endLink(link: LinkRow, endedBy: string) {
  await familyRest(`parent_links?id=eq.${enc(link.id)}&status=eq.active`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'ended', ended_at: new Date().toISOString(), ended_by: endedBy }),
  })
}

/**
 * Tell the parent to cancel App Store subscriptions we can't stop (push + email) — once per subscription row
 * (family_notices `apple_manual:{id}`, shared with the daily job, so an unlink + the next hourly run never send twice).
 * → how many rows were newly notified.
 */
export async function notifyAppleManualCancel(parentUid: string, childNickname: string | null, rows: PremiumEntitlement[]) {
  const fresh: PremiumEntitlement[] = []
  for (const row of rows) {
    // marker table unreadable: notify anyway (a missed notice is worse than a repeated one)
    if (await claimNotice(`apple_manual:${row.id}`, parentUid).catch(() => true)) fresh.push(row)
  }
  if (!fresh.length) return 0
  notifyUsers({
    type: 'account',
    userIds: [parentUid],
    build: (t) => ({
      title: t('api.push.family.appleCancel.title'),
      body: t('api.push.family.appleCancel.body', { name: childNickname || t('api.familyMail.child') }),
      data: { type: 'family_renewal', reason: 'apple_manual' },
      threadId: 'family',
    }),
  })
  void sendAppleCancelMail(parentUid, childNickname, fresh[0].current_period_end)
  return fresh.length
}

/** DELETE /api/family/links/{otherUid} — either side. → { ok, renewalStopped } */
export async function unlinkFamily(user: AuthUser, otherUid: string): Promise<{ ok: true; renewalStopped: RenewalStopped }> {
  const other = String(otherUid || '').trim()
  const link = (await activeLink(user.uid, other)) ?? (await activeLink(other, user.uid))
  if (!link) throw new FamilyError('NOT_LINKED', 'family.notLinked', 404)
  await endLink(link, user.uid)
  const { stopped, apple } = await stopParentRenewals(link.parent_uid, link.child_uid)
  const [parentNick, childNick] = await Promise.all([nicknameOf(link.parent_uid), nicknameOf(link.child_uid)])
  await notifyAppleManualCancel(link.parent_uid, childNick, apple)

  for (const [uid, name, role] of [
    [link.parent_uid, childNick, 'parent'],
    [link.child_uid, parentNick, 'child'],
  ] as const) {
    notifyUsers({
      type: 'account',
      userIds: [uid],
      build: (t) => ({
        title: t('api.push.family.unlinked.title'),
        body: t(`api.push.family.unlinked.${role}Body`, { name: name || t(role === 'parent' ? 'api.familyMail.child' : 'api.familyMail.parent') }),
        data: { type: 'family_unlinked', uid: role === 'parent' ? link.child_uid : link.parent_uid },
        threadId: 'family',
      }),
    })
    // The side that unlinked knows; mail the other side (and the parent always when a renewal changed).
    if (uid !== user.uid || (role === 'parent' && (stopped === 'stripe' || stopped === 'google'))) {
      // Apple: the parent gets the separate "cancel in iPhone Settings" mail above
      void sendUnlinkedMail(uid, name, role, role === 'parent' && stopped === 'apple_manual' ? null : stopped)
    }
  }
  return { ok: true, renewalStopped: stopped }
}

/* ───────────────────────── Account deletion / conversion ───────────────────────── */

/**
 * Account deletion (either side): every link ends like an unlink (the child keeps the paid period, auto-renew stops),
 * and the member's email requests are deleted. Safe to repeat; before parent_links.sql it does nothing.
 */
export async function endFamilyForDeletedAccount(uid: string) {
  let links: LinkRow[]
  try {
    links = [...(await linksOf({ parentUid: uid, activeOnly: true })), ...(await linksOf({ childUid: uid, activeOnly: true }))]
  } catch (error) {
    if (error instanceof FamilyError && error.code === 'SETUP_REQUIRED') return 'skipped'
    throw error
  }
  for (const link of links) {
    await endLink(link, `account_deleted:${uid}`)
    const { apple } = await stopParentRenewals(link.parent_uid, link.child_uid)
    // A deleted child: the parent still pays Apple until they cancel. A deleted parent can't be reached.
    if (link.child_uid === uid) await notifyAppleManualCancel(link.parent_uid, null, apple)
  }
  await familyRest(`parent_link_requests?or=(parent_uid.eq.${enc(uid)},child_uid.eq.${enc(uid)})`, { method: 'DELETE', prefer: 'return=minimal' })
  await familyRest(`parent_digest_settings?parent_uid=eq.${enc(uid)}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => null)
  return `ended ${links.length}`
}

/** ERP converted a parent account back to a member: its links end (renewals stop) and open requests are canceled. */
export async function endFamilyForConvertedParent(uid: string) {
  const links = await linksOf({ parentUid: uid, activeOnly: true }).catch(() => [] as LinkRow[])
  for (const link of links) {
    await endLink(link, 'converted')
    const { apple } = await stopParentRenewals(link.parent_uid, link.child_uid)
    await notifyAppleManualCancel(link.parent_uid, await nicknameOf(link.child_uid), apple)
  }
  await familyRest(`parent_link_requests?parent_uid=eq.${enc(uid)}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'canceled', decided_at: new Date().toISOString(), ...CLEARED }),
  }).catch(() => null)
}

/* ───────────────────────── Digest opt-out ───────────────────────── */

export async function digestOptedOut(parentUid: string) {
  const rows = await familyRest<{ opted_out: boolean }[]>(`parent_digest_settings?parent_uid=eq.${enc(parentUid)}&select=opted_out&limit=1`)
  return Boolean(rows[0]?.opted_out)
}

export async function setDigestOptOut(parentUid: string, optedOut: boolean) {
  await familyRest('parent_digest_settings?on_conflict=parent_uid', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ parent_uid: parentUid, opted_out: optedOut, updated_at: new Date().toISOString() }),
  })
  return { optedOut }
}
